import { useRef, useState, useEffect, ReactNode } from 'react';
import { Trash2, Edit, Archive, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeConfig {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
}

interface SwipeAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick: () => void;
}

/**
 * Hook para detectar gestos de swipe
 */
export function useSwipe(config: SwipeConfig) {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
  } = config;

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left
        onSwipeLeft?.();
      } else {
        // Swipe right
        onSwipeRight?.();
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Componente com swipe actions (estilo iOS)
 */
export function SwipeableItem({
  children,
  leftAction,
  rightAction,
  className,
}: {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  className?: string;
}) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxSwipe = 100; // Maximum swipe distance

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Limit swipe distance
    const newOffset = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setOffset(newOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Snap to action or reset
    if (offset > 60 && rightAction) {
      setOffset(maxSwipe);
    } else if (offset < -60 && leftAction) {
      setOffset(-maxSwipe);
    } else {
      setOffset(0);
    }
  };

  const handleAction = (action: SwipeAction) => {
    action.onClick();
    setOffset(0);
  };

  // Reset on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOffset(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Left Action (revealed when swiping right) */}
      {rightAction && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-start pl-4',
            'transition-opacity',
            offset > 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: `${Math.abs(offset)}px` }}
        >
          <button
            onClick={() => handleAction(rightAction)}
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              'text-white transition-transform hover:scale-110',
              rightAction.color
            )}
            style={{
              opacity: Math.min(Math.abs(offset) / 60, 1),
            }}
          >
            <rightAction.icon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Right Action (revealed when swiping left) */}
      {leftAction && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-end pr-4',
            'transition-opacity',
            offset < 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: `${Math.abs(offset)}px` }}
        >
          <button
            onClick={() => handleAction(leftAction)}
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              'text-white transition-transform hover:scale-110',
              leftAction.color
            )}
            style={{
              opacity: Math.min(Math.abs(offset) / 60, 1),
            }}
          >
            <leftAction.icon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        className="bg-white touch-pan-y"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Swipe Actions predefinidas
 */
export const SWIPE_ACTIONS = {
  DELETE: {
    label: 'Deletar',
    icon: Trash2,
    color: 'bg-red-500',
  },
  EDIT: {
    label: 'Editar',
    icon: Edit,
    color: 'bg-blue-500',
  },
  ARCHIVE: {
    label: 'Arquivar',
    icon: Archive,
    color: 'bg-gray-500',
  },
  COMPLETE: {
    label: 'Concluir',
    icon: Check,
    color: 'bg-green-500',
  },
};

/**
 * Exemplo de uso:
 * 
 * <SwipeableItem
 *   leftAction={{
 *     ...SWIPE_ACTIONS.DELETE,
 *     onClick: () => handleDelete(item.id),
 *   }}
 *   rightAction={{
 *     ...SWIPE_ACTIONS.EDIT,
 *     onClick: () => handleEdit(item.id),
 *   }}
 * >
 *   <TransactionCard transaction={transaction} />
 * </SwipeableItem>
 */
