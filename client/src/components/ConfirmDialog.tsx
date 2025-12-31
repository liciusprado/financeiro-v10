/**
 * Confirmation Dialogs
 * Sistema completo de confirmações para ações destrutivas
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle,
  Trash2,
  LogOut,
  Archive,
  XCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  icon?: React.ComponentType<{ className?: string }>;
  requireConfirmation?: boolean; // Exige digitar "CONFIRMAR"
}

/**
 * Confirmation Dialog Base
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  icon: Icon,
  requireConfirmation = false,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const handleConfirm = async () => {
    if (requireConfirmation && confirmInput !== 'CONFIRMAR') {
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error confirming action:', error);
    } finally {
      setIsLoading(false);
      setConfirmInput('');
    }
  };

  const variantStyles = {
    default: {
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      buttonClass: '',
    },
    danger: {
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
    },
    success: {
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
  };

  const style = variantStyles[variant];

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {Icon && (
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-2', style.iconBg)}>
              <Icon className={cn('h-6 w-6', style.iconColor)} />
            </div>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {requireConfirmation && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Digite <strong className="font-bold">CONFIRMAR</strong> para continuar:
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="CONFIRMAR"
              autoFocus
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || (requireConfirmation && confirmInput !== 'CONFIRMAR')}
            className={style.buttonClass}
          >
            {isLoading ? 'Processando...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook para usar confirmation dialog
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Omit<ConfirmDialogProps, 'isOpen' | 'onClose'> | null>(null);

  const confirm = (props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        ...props,
        onConfirm: async () => {
          await props.onConfirm();
          resolve(true);
        },
      });
      setIsOpen(true);
    });
  };

  const close = () => {
    setIsOpen(false);
    setTimeout(() => setConfig(null), 200);
  };

  return {
    confirm,
    ConfirmDialog: config ? (
      <ConfirmDialog {...config} isOpen={isOpen} onClose={close} />
    ) : null,
  };
}

/**
 * Confirmation Presets (diálogos pré-configurados)
 */
export const confirmPresets = {
  /**
   * Delete Confirmation
   */
  delete: (itemName: string, onConfirm: () => void | Promise<void>) => ({
    title: `Deletar ${itemName}?`,
    description: 'Esta ação não pode ser desfeita. Tem certeza que deseja continuar?',
    confirmText: 'Deletar',
    cancelText: 'Cancelar',
    variant: 'danger' as const,
    icon: Trash2,
    onConfirm,
  }),

  /**
   * Delete Multiple
   */
  deleteMultiple: (count: number, onConfirm: () => void | Promise<void>) => ({
    title: `Deletar ${count} items?`,
    description: 'Esta ação não pode ser desfeita e afetará todos os items selecionados.',
    confirmText: 'Deletar Todos',
    cancelText: 'Cancelar',
    variant: 'danger' as const,
    icon: Trash2,
    requireConfirmation: true,
    onConfirm,
  }),

  /**
   * Logout Confirmation
   */
  logout: (onConfirm: () => void | Promise<void>) => ({
    title: 'Sair da conta?',
    description: 'Você precisará fazer login novamente para acessar sua conta.',
    confirmText: 'Sair',
    cancelText: 'Cancelar',
    variant: 'warning' as const,
    icon: LogOut,
    onConfirm,
  }),

  /**
   * Archive Confirmation
   */
  archive: (itemName: string, onConfirm: () => void | Promise<void>) => ({
    title: `Arquivar ${itemName}?`,
    description: 'Este item será movido para o arquivo e não aparecerá na listagem principal.',
    confirmText: 'Arquivar',
    cancelText: 'Cancelar',
    variant: 'warning' as const,
    icon: Archive,
    onConfirm,
  }),

  /**
   * Cancel Confirmation
   */
  cancel: (onConfirm: () => void | Promise<void>) => ({
    title: 'Descartar alterações?',
    description: 'Todas as alterações não salvas serão perdidas.',
    confirmText: 'Descartar',
    cancelText: 'Continuar Editando',
    variant: 'warning' as const,
    icon: XCircle,
    onConfirm,
  }),

  /**
   * Complete Confirmation
   */
  complete: (itemName: string, onConfirm: () => void | Promise<void>) => ({
    title: `Marcar ${itemName} como concluído?`,
    description: 'Este item será movido para concluídos.',
    confirmText: 'Concluir',
    cancelText: 'Cancelar',
    variant: 'success' as const,
    icon: CheckCircle,
    onConfirm,
  }),

  /**
   * Permanent Delete (requer confirmação)
   */
  permanentDelete: (itemName: string, onConfirm: () => void | Promise<void>) => ({
    title: `DELETAR PERMANENTEMENTE ${itemName}?`,
    description: '⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL e os dados serão perdidos para sempre!',
    confirmText: 'Deletar Permanentemente',
    cancelText: 'Cancelar',
    variant: 'danger' as const,
    icon: AlertTriangle,
    requireConfirmation: true,
    onConfirm,
  }),

  /**
   * Reset Confirmation
   */
  reset: (onConfirm: () => void | Promise<void>) => ({
    title: 'Resetar configurações?',
    description: 'Todas as configurações personalizadas serão restauradas aos valores padrão.',
    confirmText: 'Resetar',
    cancelText: 'Cancelar',
    variant: 'warning' as const,
    icon: AlertTriangle,
    onConfirm,
  }),

  /**
   * Import Data Warning
   */
  importWarning: (onConfirm: () => void | Promise<void>) => ({
    title: 'Importar dados?',
    description: 'Isso pode sobrescrever dados existentes. Recomendamos fazer um backup antes.',
    confirmText: 'Importar',
    cancelText: 'Cancelar',
    variant: 'warning' as const,
    icon: Info,
    onConfirm,
  }),

  /**
   * Disconnect Service
   */
  disconnect: (serviceName: string, onConfirm: () => void | Promise<void>) => ({
    title: `Desconectar ${serviceName}?`,
    description: 'Você perderá acesso aos recursos deste serviço até reconectar.',
    confirmText: 'Desconectar',
    cancelText: 'Cancelar',
    variant: 'warning' as const,
    icon: XCircle,
    onConfirm,
  }),
};

/**
 * Quick Confirm Functions (one-liner)
 */
export async function confirmDelete(itemName: string, onConfirm: () => void | Promise<void>) {
  // TODO: Implementar usando useConfirmDialog como context
  console.log('Quick confirm:', itemName);
}

/**
 * Exemplo de uso:
 * 
 * // 1. Com hook
 * function MyComponent() {
 *   const { confirm, ConfirmDialog } = useConfirmDialog();
 *   
 *   const handleDelete = async () => {
 *     const confirmed = await confirm(
 *       confirmPresets.delete('Transação', async () => {
 *         await deleteTransaction(id);
 *       })
 *     );
 *     
 *     if (confirmed) {
 *       toast.success('Deletado!');
 *     }
 *   };
 *   
 *   return (
 *     <>
 *       <button onClick={handleDelete}>Delete</button>
 *       {ConfirmDialog}
 *     </>
 *   );
 * }
 * 
 * // 2. Customizado
 * const { confirm, ConfirmDialog } = useConfirmDialog();
 * 
 * await confirm({
 *   title: 'Título Custom',
 *   description: 'Descrição...',
 *   confirmText: 'Sim',
 *   cancelText: 'Não',
 *   variant: 'danger',
 *   icon: AlertTriangle,
 *   onConfirm: async () => {
 *     // ação
 *   },
 * });
 * 
 * // 3. Com confirmação de texto
 * await confirm({
 *   ...confirmPresets.permanentDelete('Conta', deleteAccount),
 *   requireConfirmation: true, // Exige digitar "CONFIRMAR"
 * });
 */
