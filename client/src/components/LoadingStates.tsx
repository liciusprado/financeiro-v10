/**
 * Loading States Manager
 * Gerencia múltiplos estados de loading em um só lugar
 */

import { create } from 'zustand';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingStore {
  loading: LoadingState;
  setLoading: (key: string, value: boolean) => void;
  isLoading: (key: string) => boolean;
  clearAll: () => void;
}

/**
 * Zustand store para loading states
 */
export const useLoadingStore = create<LoadingStore>((set, get) => ({
  loading: {},

  setLoading: (key: string, value: boolean) => {
    set((state) => ({
      loading: {
        ...state.loading,
        [key]: value,
      },
    }));
  },

  isLoading: (key: string) => {
    return get().loading[key] || false;
  },

  clearAll: () => {
    set({ loading: {} });
  },
}));

/**
 * Hook para usar loading state
 */
export function useLoading(key: string) {
  const { setLoading, isLoading } = useLoadingStore();

  return {
    isLoading: isLoading(key),
    setLoading: (value: boolean) => setLoading(key, value),
    startLoading: () => setLoading(key, true),
    stopLoading: () => setLoading(key, false),
  };
}

/**
 * Hook para executar operação async com loading
 */
export function useAsyncLoading<T extends (...args: any[]) => Promise<any>>(
  key: string,
  asyncFn: T
) {
  const { setLoading, isLoading } = useLoading(key);

  const execute = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    setLoading(true);
    try {
      const result = await asyncFn(...args);
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    execute,
    isLoading,
  };
}

/**
 * Loading Overlay Component
 */
export function LoadingOverlay({
  isLoading,
  message = 'Carregando...',
  fullScreen = false,
  blur = true,
}: {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
  blur?: boolean;
}) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'bg-background/80 z-50',
        blur && 'backdrop-blur-sm',
        fullScreen
          ? 'fixed inset-0'
          : 'absolute inset-0 rounded-lg'
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Loading Spinner Component
 */
export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn(
        'animate-spin text-primary',
        sizeClasses[size],
        className
      )}
    />
  );
}

/**
 * Loading Button Component
 */
export function LoadingButton({
  isLoading,
  children,
  loadingText = 'Carregando...',
  disabled,
  onClick,
  className,
  ...props
}: {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'px-4 py-2 rounded-md',
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Loading Dots Component (animação de pontos)
 */
export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
    </div>
  );
}

/**
 * Loading Progress Component
 */
export function LoadingProgress({
  progress,
  message,
  showPercentage = true,
}: {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
}) {
  return (
    <div className="space-y-2">
      {message && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{message}</span>
          {showPercentage && (
            <span className="font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Loading Pulse Component (para skeletons)
 */
export function LoadingPulse({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-muted rounded', className)} />
  );
}

/**
 * Global Loading Keys (para uso consistente)
 */
export const LOADING_KEYS = {
  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  REGISTER: 'auth.register',

  // Transactions
  FETCH_TRANSACTIONS: 'transactions.fetch',
  CREATE_TRANSACTION: 'transactions.create',
  UPDATE_TRANSACTION: 'transactions.update',
  DELETE_TRANSACTION: 'transactions.delete',

  // Goals
  FETCH_GOALS: 'goals.fetch',
  CREATE_GOAL: 'goals.create',
  UPDATE_GOAL: 'goals.update',

  // Dashboard
  FETCH_DASHBOARD: 'dashboard.fetch',

  // Export
  EXPORT_DATA: 'export.data',

  // Sync
  SYNC_DATA: 'sync.data',

  // Upload
  UPLOAD_FILE: 'upload.file',
};

/**
 * Exemplo de uso:
 * 
 * // 1. Hook básico
 * function MyComponent() {
 *   const { isLoading, startLoading, stopLoading } = useLoading('my-operation');
 *   
 *   const handleSave = async () => {
 *     startLoading();
 *     await saveData();
 *     stopLoading();
 *   };
 *   
 *   return <button disabled={isLoading}>Save</button>;
 * }
 * 
 * // 2. Hook async (automático)
 * function MyComponent() {
 *   const { execute, isLoading } = useAsyncLoading(
 *     LOADING_KEYS.CREATE_TRANSACTION,
 *     createTransaction
 *   );
 *   
 *   return (
 *     <button onClick={() => execute(data)} disabled={isLoading}>
 *       Create
 *     </button>
 *   );
 * }
 * 
 * // 3. Loading Overlay
 * function MyComponent() {
 *   const { isLoading } = useLoading(LOADING_KEYS.FETCH_DASHBOARD);
 *   
 *   return (
 *     <div className="relative">
 *       <LoadingOverlay isLoading={isLoading} message="Carregando dashboard..." />
 *       <DashboardContent />
 *     </div>
 *   );
 * }
 * 
 * // 4. Loading Button
 * <LoadingButton
 *   isLoading={isSubmitting}
 *   loadingText="Salvando..."
 *   onClick={handleSubmit}
 * >
 *   Salvar
 * </LoadingButton>
 * 
 * // 5. Loading Progress
 * <LoadingProgress
 *   progress={uploadProgress}
 *   message="Enviando arquivo..."
 * />
 */
