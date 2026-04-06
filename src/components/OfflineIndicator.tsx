import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, X } from 'lucide-react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { Button } from '@/components/ui/button';

export function OfflineIndicator() {
  const { isOnline, wasOffline, clearWasOffline } = useOfflineDetection();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show "reconnected" message briefly when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        clearWasOffline();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, clearWasOffline]);

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground"
          >
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-center gap-3">
                <WifiOff className="w-5 h-5 flex-shrink-0" />
                <div className="text-center">
                  <p className="font-medium text-sm tracking-wider">
                    YOU'RE OFFLINE
                  </p>
                  <p className="text-xs opacity-80">
                    Check your internet connection. Some features may not work.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reconnected Toast */}
      <AnimatePresence>
        {showReconnected && isOnline && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto z-[100]"
          >
            <div className="bg-green-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
              <Wifi className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm tracking-wider">
                  BACK ONLINE
                </p>
                <p className="text-xs opacity-80">
                  Your connection has been restored.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => {
                  setShowReconnected(false);
                  clearWasOffline();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Overlay for Critical Actions */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[99] pointer-events-none"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Full-page offline screen for when the app loads without internet
export function OfflineScreen() {
  const { isOnline } = useOfflineDetection();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    // Force a network check by trying to fetch
    fetch('/favicon.ico', { cache: 'no-store' })
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        setIsRetrying(false);
      });
  };

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-muted-foreground" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <h1 className="font-display text-3xl md:text-4xl tracking-wider">
            NO CONNECTION
          </h1>
          <p className="text-muted-foreground">
            It looks like you're offline. Please check your internet connection and try again.
          </p>
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-2">
          <p className="font-medium">Try these steps:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Check if airplane mode is on</li>
            <li>Turn Wi-Fi off and on again</li>
            <li>Move closer to your router</li>
            <li>Try using mobile data</li>
          </ul>
        </div>

        {/* Retry Button */}
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          className="rounded-none w-full md:w-auto px-8"
        >
          {isRetrying ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
              />
              CHECKING...
            </>
          ) : (
            'TRY AGAIN'
          )}
        </Button>

        {/* Branding */}
        <p className="text-xs text-muted-foreground/50 tracking-wider">
          BCUTZ • Premium Booking
        </p>
      </div>
    </div>
  );
}
