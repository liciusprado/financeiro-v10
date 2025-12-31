/**
 * Animation Library
 * Animações suaves e reutilizáveis
 */

import { cn } from '@/lib/utils';
import { HTMLMotionProps, motion } from 'framer-motion';

/**
 * Fade In Animation
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Slide In Animation (from direction)
 */
export function SlideIn({
  children,
  direction = 'bottom',
  delay = 0,
  duration = 0.3,
  className,
}: {
  children: React.ReactNode;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const directions = {
    top: { y: -20 },
    bottom: { y: 20 },
    left: { x: -20 },
    right: { x: 20 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...directions[direction] }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scale In Animation
 */
export function ScaleIn({
  children,
  delay = 0,
  duration = 0.3,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger Children Animation
 */
export function StaggerChildren({
  children,
  staggerDelay = 0.1,
  className,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger Item (use with StaggerChildren)
 */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Bounce Animation
 */
export function Bounce({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        repeatDelay: 1,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Pulse Animation
 */
export function Pulse({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Shake Animation (para erros)
 */
export function Shake({
  children,
  trigger,
  className,
}: {
  children: React.ReactNode;
  trigger: boolean;
  className?: string;
}) {
  return (
    <motion.div
      animate={
        trigger
          ? {
              x: [0, -10, 10, -10, 10, 0],
            }
          : {}
      }
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Rotate Animation
 */
export function Rotate({
  children,
  degrees = 360,
  duration = 1,
  repeat = Infinity,
  className,
}: {
  children: React.ReactNode;
  degrees?: number;
  duration?: number;
  repeat?: number;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ rotate: degrees }}
      transition={{ duration, repeat }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hover Scale
 */
export function HoverScale({
  children,
  scale = 1.05,
  className,
}: {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: scale * 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Number Counter Animation
 */
export function CountUp({
  from = 0,
  to,
  duration = 1,
  className,
}: {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ y: from }}
        animate={{ y: to }}
        transition={{ duration, ease: 'easeOut' }}
      >
        {to}
      </motion.span>
    </motion.span>
  );
}

/**
 * Page Transition
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reveal on Scroll
 */
export function RevealOnScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Card Flip Animation
 */
export function FlipCard({
  front,
  back,
  isFlipped,
  className,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)} style={{ perspective: 1000 }}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {front}
        </div>

        {/* Back */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Notification Badge Ping
 */
export function NotificationPing({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
    </span>
  );
}

/**
 * CSS Animation Classes (sem framer-motion)
 */
export const cssAnimations = {
  fadeIn: 'animate-in fade-in duration-300',
  fadeOut: 'animate-out fade-out duration-300',
  slideInBottom: 'animate-in slide-in-from-bottom duration-300',
  slideInTop: 'animate-in slide-in-from-top duration-300',
  slideInLeft: 'animate-in slide-in-from-left duration-300',
  slideInRight: 'animate-in slide-in-from-right duration-300',
  scaleIn: 'animate-in zoom-in duration-300',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
};

/**
 * Exemplo de uso:
 * 
 * // Fade In
 * <FadeIn delay={0.2}>
 *   <Card>Content</Card>
 * </FadeIn>
 * 
 * // Slide In
 * <SlideIn direction="bottom">
 *   <Modal />
 * </SlideIn>
 * 
 * // Stagger Children
 * <StaggerChildren>
 *   {items.map(item => (
 *     <StaggerItem key={item.id}>
 *       <ItemCard item={item} />
 *     </StaggerItem>
 *   ))}
 * </StaggerChildren>
 * 
 * // Hover Scale
 * <HoverScale scale={1.1}>
 *   <Button>Hover me</Button>
 * </HoverScale>
 * 
 * // Shake (erro)
 * <Shake trigger={hasError}>
 *   <Input />
 * </Shake>
 * 
 * // Page Transition
 * <PageTransition>
 *   <Dashboard />
 * </PageTransition>
 * 
 * // CSS classes
 * <div className={cssAnimations.fadeIn}>
 *   Content
 * </div>
 */
