/**
 * Visual Feedback Components
 * Componentes para feedback visual durante interações
 */

import { useState, useEffect } from 'react';
import { Check, X, Loader2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Success Checkmark Animation
 */
export function SuccessCheckmark({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Check className="h-8 w-8 text-green-600" strokeWidth={3} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Error X Animation
 */
export function ErrorX({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0 }}
          className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center"
        >
          <X className="h-8 w-8 text-red-600" strokeWidth={3} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Processing Spinner
 */
export function ProcessingSpinner({ show, message }: { show: boolean; message?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Progress Bar with Animation
 */
export function AnimatedProgress({
  progress,
  showPercentage = true,
  color = 'primary',
  height = 'md',
}: {
  progress: number;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'danger' | 'warning';
  height?: 'sm' | 'md' | 'lg';
}) {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-600',
    danger: 'bg-red-600',
    warning: 'bg-yellow-600',
  };

  return (
    <div className="space-y-2">
      {showPercentage && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <motion.span
            key={progress}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-medium"
          >
            {Math.round(progress)}%
          </motion.span>
        </div>
      )}
      <div className={cn('w-full bg-secondary rounded-full overflow-hidden', heightClasses[height])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full', colorClasses[color])}
        />
      </div>
    </div>
  );
}

/**
 * Status Badge
 */
export function StatusBadge({
  status,
  label,
}: {
  status: 'success' | 'error' | 'warning' | 'info' | 'loading';
  label?: string;
}) {
  const config = {
    success: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: Check,
      defaultLabel: 'Sucesso',
    },
    error: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: X,
      defaultLabel: 'Erro',
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      icon: AlertCircle,
      defaultLabel: 'Atenção',
    },
    info: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: Info,
      defaultLabel: 'Info',
    },
    loading: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      icon: Loader2,
      defaultLabel: 'Carregando',
    },
  };

  const { bg, text, icon: Icon, defaultLabel } = config[status];

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full',
        bg,
        text
      )}
    >
      <Icon className={cn('h-4 w-4', status === 'loading' && 'animate-spin')} />
      <span className="text-sm font-medium">{label || defaultLabel}</span>
    </motion.div>
  );
}

/**
 * Inline Status Indicator
 */
export function InlineStatus({
  status,
  message,
}: {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}) {
  const config = {
    idle: null,
    loading: {
      icon: Loader2,
      color: 'text-gray-600',
      animate: true,
    },
    success: {
      icon: Check,
      color: 'text-green-600',
      animate: false,
    },
    error: {
      icon: X,
      color: 'text-red-600',
      animate: false,
    },
  };

  if (status === 'idle') return null;

  const { icon: Icon, color, animate } = config[status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2"
    >
      <Icon className={cn('h-4 w-4', color, animate && 'animate-spin')} />
      {message && (
        <span className={cn('text-sm', color)}>{message}</span>
      )}
    </motion.div>
  );
}

/**
 * Ripple Effect (Material Design)
 */
export function RippleEffect({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 rounded-full bg-primary"
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Confetti Animation (para celebrações)
 */
export function Confetti({ show }: { show: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 5)],
      }));
      setParticles(newParticles);

      setTimeout(() => setParticles([]), 3000);
    }
  }, [show]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: '50%',
              y: '50%',
              scale: 0,
              opacity: 1,
            }}
            animate={{
              x: `${particle.x}%`,
              y: `${particle.y}%`,
              scale: 1,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute w-3 h-3 rounded-full"
            style={{ backgroundColor: particle.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Pulse Dot (indicador de status ao vivo)
 */
export function PulseDot({ color = 'green' }: { color?: 'green' | 'red' | 'yellow' | 'blue' }) {
  const colors = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
  };

  return (
    <span className="relative flex h-3 w-3">
      <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[color])} />
      <span className={cn('relative inline-flex rounded-full h-3 w-3', colors[color])} />
    </span>
  );
}

/**
 * Skeleton Pulse (para loading states)
 */
export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-muted rounded', className)} />
  );
}

/**
 * Shimmer Effect
 */
export function ShimmerEffect({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-muted rounded', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

/**
 * Hook para feedback temporário
 */
export function useFeedback(duration = 2000) {
  const [show, setShow] = useState(false);

  const trigger = () => {
    setShow(true);
    setTimeout(() => setShow(false), duration);
  };

  return { show, trigger };
}

/**
 * Exemplo de uso:
 * 
 * // Success Checkmark
 * const { show, trigger } = useFeedback();
 * <button onClick={trigger}>Save</button>
 * <SuccessCheckmark show={show} />
 * 
 * // Progress Bar
 * <AnimatedProgress progress={uploadProgress} />
 * 
 * // Status Badge
 * <StatusBadge status="success" label="Salvo" />
 * 
 * // Inline Status
 * <InlineStatus status={saveStatus} message="Salvando..." />
 * 
 * // Confetti (celebração)
 * <Confetti show={goalCompleted} />
 * 
 * // Pulse Dot
 * <div className="flex items-center gap-2">
 *   <PulseDot color="green" />
 *   <span>Online</span>
 * </div>
 */
