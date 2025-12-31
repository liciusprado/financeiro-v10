/**
 * Service Worker Registration
 * Registra e gerencia o Service Worker para PWA Offline
 */

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('✅ Service Worker registrado:', registration.scope);

      // Verificar atualizações a cada 1 hora
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Listener para atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão disponível
            console.log('🔄 Nova versão disponível!');
            showUpdateNotification();
          }
        });
      });

      // Background Sync
      if ('sync' in registration) {
        console.log('✅ Background Sync disponível');
      }

      // Push Notifications
      if ('pushManager' in registration) {
        console.log('✅ Push Notifications disponível');
      }

      return registration;
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  } else {
    console.warn('⚠️ Service Worker não suportado neste navegador');
  }
}

export function showUpdateNotification() {
  if (confirm('Nova versão disponível! Deseja atualizar agora?')) {
    window.location.reload();
  }
}

export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('🗑️ Service Worker removido');
    }
  }
}

export function isOnline() {
  return navigator.onLine;
}

export function addOnlineListener(callback: () => void) {
  window.addEventListener('online', callback);
}

export function addOfflineListener(callback: () => void) {
  window.addEventListener('offline', callback);
}

export async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  }
}
