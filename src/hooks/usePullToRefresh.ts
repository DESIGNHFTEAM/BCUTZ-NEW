import { useState, useCallback, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

// Helper function for haptic feedback
const triggerHaptic = async (type: 'light' | 'medium' | 'success') => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (type === 'light') {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (type === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    }
  } catch (error) {
    // Haptics not available
  }
};

export function usePullToRefresh({ 
  onRefresh, 
  threshold = 80, 
  disabled = false 
}: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const hasTriggeredThresholdHaptic = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only allow pull if the PAGE is at the very top (window scroll)
    // AND the container itself is at the top
    const isPageAtTop = window.scrollY <= 0;
    const isContainerAtTop = container.scrollTop <= 0;
    
    if (isPageAtTop && isContainerAtTop) {
      startY.current = e.touches[0].clientY;
      isPulling.current = false;
      hasTriggeredThresholdHaptic.current = false;
    } else {
      startY.current = 0;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || startY.current === 0) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // If user scrolled away from top (page or container), reset and don't pull
    if (container.scrollTop > 0 || window.scrollY > 0) {
      startY.current = 0;
      isPulling.current = false;
      hasTriggeredThresholdHaptic.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // Only start pulling if dragging downward and past a small threshold
    if (diff > 10) {
      isPulling.current = true;
      const distance = Math.max(0, (diff - 10) * 0.4); // Resistance factor
      
      if (distance > 0) {
        e.preventDefault();
        const newDistance = Math.min(distance, threshold * 1.5);
        setPullDistance(newDistance);
        
        // Trigger haptic when crossing threshold
        if (newDistance >= threshold && !hasTriggeredThresholdHaptic.current) {
          hasTriggeredThresholdHaptic.current = true;
          triggerHaptic('medium');
        } else if (newDistance < threshold && hasTriggeredThresholdHaptic.current) {
          hasTriggeredThresholdHaptic.current = false;
        }
      }
    } else if (!isPulling.current) {
      // Allow normal scroll if not pulling
      startY.current = 0;
    }
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling.current) {
      startY.current = 0;
      isPulling.current = false;
      hasTriggeredThresholdHaptic.current = false;
      setPullDistance(0);
      return;
    }
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      triggerHaptic('light');
      try {
        await onRefresh();
        triggerHaptic('success');
      } finally {
        setIsRefreshing(false);
      }
    }
    
    startY.current = 0;
    isPulling.current = false;
    hasTriggeredThresholdHaptic.current = false;
    setPullDistance(0);
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
}
