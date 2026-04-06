import { ReactNode, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2 } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useIsMobile } from '@/hooks/use-mobile';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className = '',
  disabled = false 
}: PullToRefreshProps) {
  const isMobile = useIsMobile();
  
  const { containerRef, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled: disabled || !isMobile,
  });

  // Don't show pull indicator on desktop
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ 
        touchAction: pullDistance > 0 ? 'none' : 'auto',
      }}
    >
      {/* Pull indicator */}
      <motion.div 
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-10"
        style={{ 
          top: -50,
          height: 50,
        }}
        animate={{ 
          y: pullDistance,
          opacity: pullProgress,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="bg-primary/10 backdrop-blur-sm rounded-full p-2">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div
              animate={{ rotate: pullProgress * 180 }}
            >
              <RefreshCw className="w-5 h-5 text-primary" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content with pull offset */}
      <motion.div
        animate={{ 
          y: isRefreshing ? 40 : pullDistance * 0.5,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
