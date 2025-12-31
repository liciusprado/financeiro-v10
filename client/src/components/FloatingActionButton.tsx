import { useState } from 'react';
import { useLocation } from 'wouter';
import { Plus, X, TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  path: string;
}

const FAB_ACTIONS: FABAction[] = [
  {
    id: 'receita',
    label: 'Receita',
    icon: TrendingUp,
    color: 'bg-green-500 hover:bg-green-600',
    path: '/receitas',
  },
  {
    id: 'despesa',
    label: 'Despesa',
    icon: TrendingDown,
    color: 'bg-red-500 hover:bg-red-600',
    path: '/despesas',
  },
  {
    id: 'meta',
    label: 'Meta',
    icon: Target,
    color: 'bg-blue-500 hover:bg-blue-600',
    path: '/metas',
  },
  {
    id: 'orcamento',
    label: 'Orçamento',
    icon: Wallet,
    color: 'bg-purple-500 hover:bg-purple-600',
    path: '/orcamentos',
  },
];

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleAction = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action Buttons */}
      <div className="fixed bottom-24 right-6 z-50 lg:hidden">
        <div
          className={cn(
            'flex flex-col-reverse gap-4 transition-all duration-300',
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          )}
        >
          {FAB_ACTIONS.map((action, index) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                className={cn(
                  'transition-all duration-300',
                  isOpen ? 'opacity-100' : 'opacity-0'
                )}
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                }}
              >
                <button
                  onClick={() => handleAction(action.path)}
                  className={cn(
                    'flex items-center gap-3 shadow-lg rounded-full pr-4 pl-4 py-3',
                    'text-white font-medium transition-transform hover:scale-105',
                    action.color
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{action.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-20 right-6 z-50',
          'w-14 h-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-300',
          'lg:hidden',
          isOpen
            ? 'bg-gray-800 rotate-45 hover:bg-gray-900'
            : 'bg-primary hover:bg-primary/90 hover:scale-110'
        )}
        aria-label={isOpen ? 'Fechar menu' : 'Adicionar'}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </button>
    </>
  );
}

/**
 * FAB Simples (sem menu expansível)
 */
export function SimpleFAB({
  onClick,
  icon: Icon = Plus,
  label = 'Adicionar',
  color = 'bg-primary',
}: {
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-6 z-50',
        'w-14 h-14 rounded-full shadow-lg',
        'flex items-center justify-center',
        'transition-transform hover:scale-110',
        'lg:hidden',
        color
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6 text-white" />
    </button>
  );
}
