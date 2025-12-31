// Service Worker para PWA Offline
// Versão: 10.1.0

const CACHE_VERSION = 'v10.1.0';
const CACHE_NAME = `financeiro-pwa-${CACHE_VERSION}`;

// Assets estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Estratégias de cache
const CACHE_STRATEGIES = {
  // Cache First: Assets estáticos
  CACHE_FIRST: 'cache-first',
  // Network First: API calls
  NETWORK_FIRST: 'network-first',
  // Stale While Revalidate: Imagens, fonts
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
};

// URLs de API (Network First)
const API_URLS = ['/trpc', '/api'];

// URLs de assets (Cache First)
const ASSET_URLS = ['.css', '.js', '.woff', '.woff2', '.ttf'];

// ========== INSTALL EVENT ==========
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Static assets cached');
      return self.skipWaiting();
    })
  );
});

// ========== ACTIVATE EVENT ==========
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('financeiro-pwa-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Old caches deleted');
      return self.clients.claim();
    })
  );
});

// ========== FETCH EVENT ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de outras origens
  if (url.origin !== location.origin) {
    return;
  }

  // Determinar estratégia baseada na URL
  const strategy = getStrategy(url);

  event.respondWith(
    handleRequest(request, strategy)
  );
});

// ========== ESTRATÉGIAS DE CACHE ==========

function getStrategy(url) {
  const pathname = url.pathname;

  // API calls: Network First
  if (API_URLS.some(apiUrl => pathname.includes(apiUrl))) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Assets estáticos: Cache First
  if (ASSET_URLS.some(ext => pathname.endsWith(ext))) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // Imagens, fonts: Stale While Revalidate
  if (pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf)$/)) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // Default: Network First
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    default:
      return fetch(request);
  }
}

// Cache First: Tenta cache primeiro, se falhar busca na rede
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  console.log('[SW] Cache miss, fetching:', request.url);
  const response = await fetch(request);

  // Cachear apenas respostas válidas
  if (response && response.status === 200) {
    cache.put(request, response.clone());
  }

  return response;
}

// Network First: Tenta rede primeiro, se falhar usa cache
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    // Cachear apenas respostas válidas
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Se não tem cache, retornar offline page
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Você está offline. Reconecte para atualizar os dados.',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503,
      }
    );
  }
}

// Stale While Revalidate: Retorna cache imediatamente, atualiza em background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Fetch em paralelo
  const fetchPromise = fetch(request).then((response) => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Retorna cache imediatamente se existir
  return cached || fetchPromise;
}

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  console.log('[SW] Syncing pending data...');

  // Abrir IndexedDB para pegar dados pendentes
  const db = await openDB();
  const pendingItems = await db.getAll('pending');

  for (const item of pendingItems) {
    try {
      // Tentar enviar para API
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });

      if (response.ok) {
        // Remover do IndexedDB se sucesso
        await db.delete('pending', item.id);
        console.log('[SW] Synced item:', item.id);
      }
    } catch (error) {
      console.error('[SW] Sync failed for item:', item.id, error);
    }
  }

  console.log('[SW] Sync complete!');
}

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Planejamento Financeiro';
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// ========== INDEXEDDB HELPER ==========
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('financeiro-pwa', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

console.log('[SW] Service Worker loaded!', CACHE_VERSION);
