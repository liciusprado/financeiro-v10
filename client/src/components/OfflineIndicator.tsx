import { useEffect, useState } from 'react';
import { WifiOff, Wifi, CloudOff, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkPendingSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar dados pendentes ao carregar
    checkPendingSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingSync = async () => {
    try {
      const db = await openDB();
      const pending = await db.getAll('pendingTransactions');
      setSyncPending(pending.length > 0);
    } catch (error) {
      console.error('Erro ao verificar dados pendentes:', error);
    }
  };

  // Não mostrar nada se está online e sem dados pendentes
  if (isOnline && !syncPending) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <Badge
        variant={isOnline ? 'default' : 'destructive'}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 shadow-lg',
          syncPending && isOnline && 'bg-orange-500 hover:bg-orange-600'
        )}
      >
        {isOnline ? (
          syncPending ? (
            <>
              <CloudOff className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Sincronizando...</span>
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4" />
              <span className="text-sm font-medium">Online</span>
            </>
          )
        ) : (
          <>
            <WifiOff className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">Offline</span>
          </>
        )}
      </Badge>
      
      {!isOnline && (
        <div className="mt-2 text-xs text-muted-foreground bg-background/95 backdrop-blur px-3 py-2 rounded-md shadow-md border">
          Suas alterações serão salvas localmente
        </div>
      )}
    </div>
  );
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FinanceiroOfflineDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
