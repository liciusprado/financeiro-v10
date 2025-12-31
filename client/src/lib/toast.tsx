/**
 * Advanced Toast Notifications
 * Sistema completo de notificações com diferentes tipos e ações
 */

import { toast as sonnerToast } from 'sonner';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  duration?: number;
  action?: ToastAction;
  description?: string;
  closeButton?: boolean;
}

/**
 * Toast Helper com estilos customizados
 */
export const toast = {
  /**
   * Success Toast
   */
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      duration: options?.duration || 4000,
      description: options?.description,
      icon: <CheckCircle2 className="h-5 w-5" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      closeButton: options?.closeButton,
      classNames: {
        toast: 'border-green-200 bg-green-50',
        title: 'text-green-900',
        description: 'text-green-700',
        icon: 'text-green-600',
      },
    });
  },

  /**
   * Error Toast
   */
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      duration: options?.duration || 6000,
      description: options?.description,
      icon: <AlertCircle className="h-5 w-5" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      closeButton: options?.closeButton,
      classNames: {
        toast: 'border-red-200 bg-red-50',
        title: 'text-red-900 font-semibold',
        description: 'text-red-700',
        icon: 'text-red-600',
      },
    });
  },

  /**
   * Warning Toast
   */
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      duration: options?.duration || 5000,
      description: options?.description,
      icon: <AlertTriangle className="h-5 w-5" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      closeButton: options?.closeButton,
      classNames: {
        toast: 'border-yellow-200 bg-yellow-50',
        title: 'text-yellow-900',
        description: 'text-yellow-700',
        icon: 'text-yellow-600',
      },
    });
  },

  /**
   * Info Toast
   */
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      duration: options?.duration || 4000,
      description: options?.description,
      icon: <Info className="h-5 w-5" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      closeButton: options?.closeButton,
      classNames: {
        toast: 'border-blue-200 bg-blue-50',
        title: 'text-blue-900',
        description: 'text-blue-700',
        icon: 'text-blue-600',
      },
    });
  },

  /**
   * Loading Toast
   */
  loading: (message: string, options?: Omit<ToastOptions, 'action'>) => {
    return sonnerToast.loading(message, {
      duration: Infinity, // Não fecha automaticamente
      description: options?.description,
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      classNames: {
        toast: 'border-gray-200 bg-gray-50',
        title: 'text-gray-900',
        description: 'text-gray-700',
        icon: 'text-gray-600',
      },
    });
  },

  /**
   * Promise Toast (automático para operações assíncronas)
   */
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
      description?: string;
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
      description: options.description,
    });
  },

  /**
   * Custom Toast
   */
  custom: (content: React.ReactNode, options?: ToastOptions) => {
    return sonnerToast.custom(content, {
      duration: options?.duration || 4000,
    });
  },

  /**
   * Dismiss Toast
   */
  dismiss: (toastId?: string | number) => {
    if (toastId) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
  },
};

/**
 * Toast Presets para casos comuns
 */
export const toastPresets = {
  // Operações CRUD
  created: (itemName: string) => {
    toast.success(`${itemName} criado com sucesso!`);
  },

  updated: (itemName: string) => {
    toast.success(`${itemName} atualizado com sucesso!`);
  },

  deleted: (itemName: string, onUndo?: () => void) => {
    toast.success(`${itemName} deletado`, {
      action: onUndo
        ? {
            label: 'Desfazer',
            onClick: onUndo,
          }
        : undefined,
    });
  },

  // Autenticação
  loginSuccess: () => {
    toast.success('Login realizado com sucesso!');
  },

  logoutSuccess: () => {
    toast.info('Você saiu da conta');
  },

  // Validação
  validationError: (field: string) => {
    toast.error('Erro de validação', {
      description: `Por favor, verifique o campo: ${field}`,
    });
  },

  // Rede
  networkError: () => {
    toast.error('Erro de conexão', {
      description: 'Verifique sua conexão com a internet',
      action: {
        label: 'Tentar novamente',
        onClick: () => window.location.reload(),
      },
    });
  },

  // Limite atingido
  limitReached: (limitName: string) => {
    toast.warning(`Limite atingido: ${limitName}`, {
      description: 'Considere fazer upgrade do plano',
    });
  },

  // Operação longa
  processing: (operation: string) => {
    return toast.loading(`${operation}...`, {
      description: 'Isso pode levar alguns segundos',
    });
  },

  // Copiado
  copied: () => {
    toast.success('Copiado para área de transferência!');
  },

  // Download
  downloadStarted: () => {
    toast.info('Download iniciado', {
      description: 'O arquivo será baixado em breve',
    });
  },

  // Upload
  uploadSuccess: (fileName: string) => {
    toast.success('Upload concluído!', {
      description: fileName,
    });
  },

  uploadError: (fileName: string) => {
    toast.error('Falha no upload', {
      description: fileName,
    });
  },

  // Sincronização
  syncStarted: () => {
    return toast.loading('Sincronizando...', {
      description: 'Buscando dados mais recentes',
    });
  },

  syncSuccess: () => {
    toast.success('Sincronização concluída!');
  },

  // Backup
  backupCreated: () => {
    toast.success('Backup criado com sucesso!', {
      action: {
        label: 'Ver backups',
        onClick: () => (window.location.href = '/configuracoes/backups'),
      },
    });
  },

  // Metas
  goalCompleted: (goalName: string) => {
    toast.success('🎉 Meta alcançada!', {
      description: goalName,
      duration: 6000,
    });
  },

  // Gamificação
  achievementUnlocked: (achievementName: string) => {
    toast.success('🏆 Conquista desbloqueada!', {
      description: achievementName,
      duration: 6000,
    });
  },

  levelUp: (level: number) => {
    toast.success(`⬆️ Level UP! Agora você é nível ${level}!`, {
      duration: 6000,
    });
  },

  // Colaboração
  inviteSent: (email: string) => {
    toast.success('Convite enviado!', {
      description: `Para: ${email}`,
    });
  },

  memberAdded: (name: string) => {
    toast.success(`${name} foi adicionado ao grupo`);
  },

  // Permissões
  permissionDenied: () => {
    toast.error('Permissão negada', {
      description: 'Você não tem permissão para realizar esta ação',
    });
  },

  // Manutenção
  maintenanceMode: () => {
    toast.warning('Modo manutenção ativo', {
      description: 'Algumas funcionalidades podem estar indisponíveis',
      duration: 10000,
    });
  },

  // Update disponível
  updateAvailable: () => {
    toast.info('Nova versão disponível!', {
      description: 'Recarregue a página para atualizar',
      action: {
        label: 'Atualizar',
        onClick: () => window.location.reload(),
      },
      duration: 10000,
    });
  },
};

/**
 * Toast com Promise (auto-gerenciado)
 */
export async function toastAsync<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  const toastId = toast.loading(messages.loading);

  try {
    const result = await promise;
    toast.dismiss(toastId);
    toast.success(messages.success);
    return result;
  } catch (error: any) {
    toast.dismiss(toastId);
    toast.error(messages.error, {
      description: error.message,
    });
    throw error;
  }
}

/**
 * Exemplo de uso:
 * 
 * // Básico
 * toast.success('Operação bem-sucedida!');
 * toast.error('Algo deu errado');
 * 
 * // Com opções
 * toast.warning('Atenção!', {
 *   description: 'Verifique os dados antes de continuar',
 *   duration: 6000,
 *   action: {
 *     label: 'Revisar',
 *     onClick: () => console.log('Reviewing...'),
 *   },
 * });
 * 
 * // Loading
 * const toastId = toast.loading('Processando...');
 * // ... operação
 * toast.dismiss(toastId);
 * toast.success('Concluído!');
 * 
 * // Promise (automático)
 * await toastAsync(
 *   saveTransaction(),
 *   {
 *     loading: 'Salvando transação...',
 *     success: 'Transação salva!',
 *     error: 'Erro ao salvar',
 *   }
 * );
 * 
 * // Presets
 * toastPresets.created('Transação');
 * toastPresets.deleted('Meta', () => undoDelete());
 * toastPresets.goalCompleted('Comprar casa');
 */
