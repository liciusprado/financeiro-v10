import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    // Verificar se Service Workers são suportados
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Monitorar status online/offline
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setRegistration(reg);

      // Verificar atualizações
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão disponível
            setNeedsUpdate(true);
            toast.info('Nova versão disponível!', {
              description: 'Clique para atualizar',
              action: {
                label: 'Atualizar',
                onClick: () => updateServiceWorker(),
              },
              duration: Infinity,
            });
          }
        });
      });

      console.log('✅ Service Worker registrado!');
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  };

  const updateServiceWorker = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const handleOnline = () => {
    setIsOnline(true);
    toast.success('Você está online! ✅', {
      description: 'Sincronizando dados...',
    });
    
    // Disparar background sync
    if (registration?.sync) {
      registration.sync.register('sync-transactions');
      registration.sync.register('sync-backups');
    }
  };

  const handleOffline = () => {
    setIsOnline(false);
    toast.warning('Você está offline! 📵', {
      description: 'Mudanças serão sincronizadas quando voltar online',
    });
  };

  return {
    registration,
    isOnline,
    needsUpdate,
    updateServiceWorker,
  };
}

// Hook para salvar dados offline
export function useOfflineStorage() {
  const saveOffline = async (storeName: string, data: any) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, 'readwrite');
      await tx.objectStore(storeName).add(data);
      toast.success('Salvo offline!', {
        description: 'Será sincronizado quando voltar online',
      });
    } catch (error) {
      console.error('Erro ao salvar offline:', error);
      toast.error('Erro ao salvar offline');
    }
  };

  const getPending = async (storeName: string) => {
    try {
      const db = await openDB();
      return await db.getAll(storeName);
    } catch (error) {
      console.error('Erro ao buscar pendentes:', error);
      return [];
    }
  };

  return { saveOffline, getPending };
}

// Helper para abrir IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
