import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Card otimizado para toque em mobile
 */
export function TouchCard({
  children,
  onClick,
  className,
  showChevron = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  showChevron?: boolean;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'transition-all active:scale-[0.98] active:bg-muted/50',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">{children}</div>
        {showChevron && (
          <ChevronRight className="h-5 w-5 text-muted-foreground mr-4" />
        )}
      </div>
    </Card>
  );
}

/**
 * Lista com items otimizados para toque
 */
export function TouchList({
  items,
  renderItem,
  onItemClick,
  emptyMessage = 'Nenhum item encontrado',
}: {
  items: any[];
  renderItem: (item: any, index: number) => ReactNode;
  onItemClick?: (item: any, index: number) => void;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          onClick={() => onItemClick?.(item, index)}
          className={cn(
            'transition-all active:scale-[0.98]',
            onItemClick && 'cursor-pointer'
          )}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

/**
 * Botão grande otimizado para toque (min 44x44px - Apple guidelines)
 */
export function TouchButton({
  children,
  onClick,
  variant = 'default',
  size = 'lg',
  className,
  fullWidth = false,
  ...props
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  fullWidth?: boolean;
  [key: string]: any;
}) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      className={cn(
        'min-h-[44px] min-w-[44px] touch-manipulation',
        'active:scale-95 transition-transform',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Input otimizado para mobile
 */
export function TouchInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  className,
  ...props
}: {
  label?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex h-12 w-full rounded-md border border-input bg-background',
          'px-4 py-2 text-base ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'touch-manipulation',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Sheet/Modal otimizado para mobile (slide from bottom)
 */
export function MobileSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="p-6 pb-8">{children}</div>

        {/* Safe area bottom */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
}

/**
 * Número grande formatado (para valores monetários)
 */
export function BigNumber({
  value,
  prefix = 'R$',
  size = 'xl',
  color = 'default',
  showSign = false,
}: {
  value: number;
  prefix?: string;
  size?: 'lg' | 'xl' | '2xl' | '3xl';
  color?: 'default' | 'success' | 'danger' | 'warning';
  showSign?: boolean;
}) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  const sizeClasses = {
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
    '3xl': 'text-5xl',
  };

  const colorClasses = {
    default: 'text-foreground',
    success: 'text-green-600',
    danger: 'text-red-600',
    warning: 'text-yellow-600',
  };

  const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';

  return (
    <div className={cn('font-bold tabular-nums', sizeClasses[size], colorClasses[color])}>
      {sign}
      {prefix} {formatted}
    </div>
  );
}

/**
 * Pull to Refresh (experimental)
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}) {
  // TODO: Implement pull to refresh
  // For now, just render children
  return <>{children}</>;
}

/**
 * Grid responsivo (ajusta automaticamente)
 */
export function ResponsiveGrid({
  children,
  minCardWidth = 280,
  gap = 4,
}: {
  children: ReactNode;
  minCardWidth?: number;
  gap?: number;
}) {
  return (
    <div
      className={cn('grid gap-${gap}')}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
