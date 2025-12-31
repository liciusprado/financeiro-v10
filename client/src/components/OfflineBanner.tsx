import { useOnlineStatus } from '@/hooks/usePWA';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Banner que mostra quando está offline
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Mostrar "reconectado" por 3 segundos
      setTimeout(() => setShow(false), 3000);
    }
  }, [isOnline, wasOffline]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isOnline ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 text-white">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">
              Conexão restaurada! Sincronizando dados...
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              Você está offline. Algumas funcionalidades podem estar limitadas.
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Botão de instalar PWA
 */
export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ PWA instalado');
    }

    setDeferredPrompt(null);
    setShowButton(false);
  }

  if (!showButton) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all z-50"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span className="font-medium">Instalar App</span>
    </button>
  );
}
