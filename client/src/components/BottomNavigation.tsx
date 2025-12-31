import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  Home,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
}

const NAV_ITEMS: BottomNavItem[] = [
  {
    id: 'home',
    label: 'Início',
    icon: Home,
    path: '/',
    color: 'text-blue-600',
  },
  {
    id: 'receitas',
    label: 'Receitas',
    icon: TrendingUp,
    path: '/receitas',
    color: 'text-green-600',
  },
  {
    id: 'add',
    label: 'Adicionar',
    icon: Plus,
    path: '#',
    color: 'text-white',
  },
  {
    id: 'despesas',
    label: 'Despesas',
    icon: TrendingDown,
    path: '/despesas',
    color: 'text-red-600',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    path: '/relatorios',
    color: 'text-purple-600',
  },
];

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleNavClick = (item: BottomNavItem) => {
    if (item.id === 'add') {
      setShowQuickAdd(true);
    } else {
      setLocation(item.path);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            // Special styling for Add button
            if (item.id === 'add') {
              return (
                <Dialog key={item.id} open={showQuickAdd} onOpenChange={setShowQuickAdd}>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => handleNavClick(item)}
                      className="flex flex-col items-center justify-center relative -top-4"
                    >
                      <div className="w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs mt-1 font-medium text-primary">
                        {item.label}
                      </span>
                    </button>
                  </DialogTrigger>
                  <QuickAddDialog onClose={() => setShowQuickAdd(false)} />
                </Dialog>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-all',
                  'hover:bg-gray-50 active:bg-gray-100'
                )}
              >
                <Icon
                  className={cn(
                    'h-6 w-6 transition-colors',
                    active ? item.color : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'text-xs mt-1 transition-colors',
                    active ? 'font-medium ' + item.color : 'text-gray-500'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Safe area for devices with notch */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </nav>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-20 lg:hidden" />
    </>
  );
}

/**
 * Quick Add Dialog
 */
function QuickAddDialog({ onClose }: { onClose: () => void }) {
  const [, setLocation] = useLocation();

  const quickActions = [
    {
      id: 'receita',
      label: 'Nova Receita',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600 hover:bg-green-200',
      path: '/receitas',
    },
    {
      id: 'despesa',
      label: 'Nova Despesa',
      icon: TrendingDown,
      color: 'bg-red-100 text-red-600 hover:bg-red-200',
      path: '/despesas',
    },
    {
      id: 'meta',
      label: 'Nova Meta',
      icon: Target,
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      path: '/metas',
    },
  ];

  const handleAction = (path: string) => {
    setLocation(path);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Adicionar</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 py-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              onClick={() => handleAction(action.path)}
              className={cn(
                'h-24 flex flex-col gap-2',
                action.color
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </DialogContent>
  );
}

/**
 * Hook para detectar se está em mobile
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  if (typeof window !== 'undefined') {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }

  return isMobile;
}
