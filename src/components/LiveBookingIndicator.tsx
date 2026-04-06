import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const cities = ['Zürich', 'Bern', 'Basel', 'Geneva', 'Lausanne'];
const names = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Max', 'Chris', 'Jamie'];

export function LiveBookingIndicator() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    // Don't run timers on mobile
    if (isMobile) return;

    // Show a random booking notification every 30-60 seconds
    const showNotification = () => {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const name = names[Math.floor(Math.random() * names.length)];
      const minutes = Math.floor(Math.random() * 5) + 1;
      
      setMessage(`${name} just booked in ${city} • ${minutes}m ago`);
      setShow(true);
      
      setTimeout(() => setShow(false), 4000);
    };

    // Initial delay
    const initialTimeout = setTimeout(showNotification, 5000);
    
    // Random interval between 30-60 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        showNotification();
      }
    }, 35000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isMobile]);

  // Don't render on mobile
  if (isMobile) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-full shadow-lg">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </motion.div>
            <span className="text-sm font-medium">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
