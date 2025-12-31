import { useState, useEffect } from 'react';

/**
 * Hook para detectar status online/offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      console.log('🟢 Conexão restaurada');
    }

    function handleOffline() {
      setIsOnline(false);
      console.log('🔴 Conexão perdida');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook para sincronizar dados quando voltar online
 */
export function useBackgroundSync() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOnline && 'serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      syncData();
    }
  }, [isOnline]);

  async function syncData() {
    try {
      setIsSyncing(true);
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-pending-data');
      console.log('🔄 Background sync registrado');
    } catch (error) {
      console.error('❌ Erro ao registrar sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }

  return { isSyncing, syncData };
}

/**
 * Hook para instalar PWA
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('💾 PWA instalável');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} instalar`);
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  }

  return { isInstallable, promptInstall };
}
