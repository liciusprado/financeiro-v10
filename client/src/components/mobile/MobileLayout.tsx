import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Container principal mobile-first
 */
export function MobileContainer({
  children,
  className,
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        'min-h-screen bg-background',
        !noPadding && 'px-4 py-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Header fixo mobile
 */
export function MobileHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  sticky = true,
}: {
  title: string;
  subtitle?: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  sticky?: boolean;
}) {
  return (
    <header
      className={cn(
        'bg-white border-b z-10',
        sticky && 'sticky top-0'
      )}
    >
      {/* Safe area top */}
      <div className="h-[env(safe-area-inset-top)] bg-white" />

      <div className="flex items-center justify-between px-4 py-4">
        {/* Left Action */}
        <div className="flex items-center gap-3 flex-1">
          {leftAction}
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Action */}
        {rightAction && <div className="flex items-center gap-2">{rightAction}</div>}
      </div>
    </header>
  );
}

/**
 * Section com título
 */
export function MobileSection({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>

      {/* Content */}
      {children}
    </section>
  );
}

/**
 * Grid de cards responsivo
 */
export function CardGrid({
  children,
  columns = {
    default: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 4,
  },
  gap = 4,
}: {
  children: ReactNode;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
}) {
  const gridClass = cn(
    'grid',
    `gap-${gap}`,
    columns.default && `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`
  );

  return <div className={gridClass}>{children}</div>;
}

/**
 * Stack de elementos (flex column)
 */
export function Stack({
  children,
  spacing = 4,
  className,
}: {
  children: ReactNode;
  spacing?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col', `gap-${spacing}`, className)}>
      {children}
    </div>
  );
}

/**
 * Inline (flex row)
 */
export function Inline({
  children,
  spacing = 2,
  align = 'center',
  justify = 'start',
  wrap = false,
  className,
}: {
  children: ReactNode;
  spacing?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}) {
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      className={cn(
        'flex',
        `gap-${spacing}`,
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Divider
 */
export function Divider({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  if (label) {
    return (
      <div className={cn('relative', className)}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{label}</span>
        </div>
      </div>
    );
  }

  return <hr className={cn('border-t', className)} />;
}

/**
 * Spacer (espaço vazio)
 */
export function Spacer({ size = 4 }: { size?: number }) {
  return <div className={`h-${size}`} />;
}

/**
 * Hide on mobile / Show only mobile
 */
export function HideOnMobile({ children }: { children: ReactNode }) {
  return <div className="hidden lg:block">{children}</div>;
}

export function ShowOnlyMobile({ children }: { children: ReactNode }) {
  return <div className="lg:hidden">{children}</div>;
}

/**
 * Scroll container horizontal
 */
export function HorizontalScroll({
  children,
  className,
  showScrollbar = false,
}: {
  children: ReactNode;
  className?: string;
  showScrollbar?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex gap-4 overflow-x-auto snap-x snap-mandatory',
        'pb-4 -mx-4 px-4',
        !showScrollbar && 'scrollbar-hide',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Sticky bottom bar (para ações principais)
 */
export function StickyBottomBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      {/* Spacer */}
      <div className="h-20 lg:hidden" />

      {/* Sticky Bar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40',
          'bg-white border-t shadow-lg',
          'px-4 py-3',
          'lg:hidden',
          className
        )}
      >
        {children}
        {/* Safe area */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
}

/**
 * Empty State (estado vazio)
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
