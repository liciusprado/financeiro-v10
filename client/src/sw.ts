/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Limpar caches antigos
cleanupOutdatedCaches();

// Pre-cache de arquivos estáticos (gerado automaticamente pelo build)
precacheAndRoute(self.__WB_MANIFEST);

// ========================================
// ESTRATÉGIAS DE CACHE
// ========================================

// 1. Cache-First: Assets estáticos (CSS, JS, Fonts, Images)
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// 2. Stale-While-Revalidate: API calls (dados financeiros)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutos
      }),
    ],
  })
);

// 3. Network-First: HTML pages
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60, // 24 horas
      }),
    ],
  })
);

// ========================================
// BACKGROUND SYNC
// ========================================

// Registrar sync quando voltar online
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
  if (event.tag === 'sync-backups') {
    event.waitUntil(syncBackups());
  }
});

async function syncTransactions() {
  try {
    // Buscar transações pendentes do IndexedDB
    const db = await openDB();
    const pendingTransactions = await db.getAll('pendingTransactions');
    
    // Enviar para servidor
    for (const transaction of pendingTransactions) {
      const response = await fetch('/api/trpc/createExpense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      
      if (response.ok) {
        // Remover do IndexedDB após sucesso
        await db.delete('pendingTransactions', transaction.id);
      }
    }
    
    // Notificar usuário
    self.registration.showNotification('Sincronizado! ✅', {
      body: `${pendingTransactions.length} transações enviadas`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
    });
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
  }
}

async function syncBackups() {
  try {
    const db = await openDB();
    const pendingBackups = await db.getAll('pendingBackups');
    
    for (const backup of pendingBackups) {
      const response = await fetch('/api/trpc/createBackup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      });
      
      if (response.ok) {
        await db.delete('pendingBackups', backup.id);
      }
    }
  } catch (error) {
    console.error('Erro ao sincronizar backups:', error);
  }
}

// ========================================
// NOTIFICAÇÕES PUSH
// ========================================

self.addEventListener('push', (event: any) => {
  const data = event.data?.json() || {};
  
  const options: NotificationOptions = {
    body: data.body || 'Nova notificação',
    icon: data.icon || '/icon-192.png',
    badge: '/badge-72.png',
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Planejamento Financeiro', options)
  );
});

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data || '/')
    );
  }
});

// ========================================
// HELPER: IndexedDB
// ========================================

async function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('FinanceiroOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingTransactions')) {
        db.createObjectStore('pendingTransactions', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pendingBackups')) {
        db.createObjectStore('pendingBackups', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('cachedData')) {
        db.createObjectStore('cachedData', { keyPath: 'key' });
      }
    };
  });
}

// ========================================
// INSTALAÇÃO E ATIVAÇÃO
// ========================================

self.addEventListener('install', (event) => {
  console.log('✅ Service Worker instalado!');
  self.skipWaiting(); // Ativar imediatamente
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ativado!');
  event.waitUntil(self.clients.claim()); // Tomar controle de todas as páginas
});

// ========================================
// MENSAGENS
// ========================================

self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_DATA') {
    cacheCustomData(event.data.key, event.data.value);
  }
});

async function cacheCustomData(key: string, value: any) {
  const db = await openDB();
  const tx = db.transaction('cachedData', 'readwrite');
  await tx.objectStore('cachedData').put({ key, value, timestamp: Date.now() });
}

console.log('🚀 Service Worker v10.1 carregado!');
