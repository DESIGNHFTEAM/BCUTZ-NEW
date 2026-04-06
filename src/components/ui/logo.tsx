import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import cutzLogoLight from '@/assets/cutz-logo.svg';
import cutzLogoDark from '@/assets/cutz-logo-dark.svg';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  forceDark?: boolean;
  variant?: 'hero' | 'nav' | 'static' | 'loading';
}

const sizeClasses = {
  sm: 'h-8 w-auto',
  md: 'h-10 w-auto',
  lg: 'h-14 w-auto',
  xl: 'h-20 w-auto',
  '2xl': 'h-32 w-auto',
};

export function Logo({ className, size = 'md', forceDark, variant = 'nav' }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [animationKey, setAnimationKey] = useState(0);
  
  // Use dark logo (black) on light backgrounds, light logo (white) on dark backgrounds
  const useDarkLogo = forceDark !== undefined ? forceDark : resolvedTheme === 'light';
  const logoSrc = useDarkLogo ? cutzLogoDark : cutzLogoLight;

  // Loading variant: flickers trying to turn on, briefly succeeds, then dies
  if (variant === 'loading') {
    return (
      <motion.img 
        key={animationKey}
        src={logoSrc} 
        alt="BCUTZ" 
        className={cn(sizeClasses[size], 'object-contain cursor-pointer', className)}
        onMouseEnter={() => setAnimationKey(prev => prev + 1)}
        initial={{ opacity: 0 }}
        animate={{
          opacity: [
            0.1, 0.4, 0.1, 0.5, 0.1, 0.3, 0.6, 0.1, 0.4,
            0.1, 0.5, 0.2, 0.6, 0.1, 0.4, 0.2, 0.5, 0.3,
            0.6, 0.8, 0.9, 1, 1, 1, 1,
            0.7, 0.3, 0.5, 0.1, 0.2, 0.05, 0.02, 0
          ],
          filter: [
            'drop-shadow(0 0 2px rgba(255, 59, 48, 0.2)) brightness(0.3)',
            'drop-shadow(0 0 12px rgba(255, 59, 48, 0.5)) brightness(0.6)',
            'drop-shadow(0 0 1px rgba(255, 59, 48, 0.1)) brightness(0.2)',
            'drop-shadow(0 0 14px rgba(255, 59, 48, 0.6)) brightness(0.7)',
            'drop-shadow(0 0 2px rgba(255, 59, 48, 0.1)) brightness(0.2)',
            'drop-shadow(0 0 8px rgba(255, 59, 48, 0.4)) brightness(0.5)',
            'drop-shadow(0 0 16px rgba(255, 59, 48, 0.7)) brightness(0.8)',
            'drop-shadow(0 0 1px rgba(255, 59, 48, 0.1)) brightness(0.2)',
            'drop-shadow(0 0 12px rgba(255, 59, 48, 0.5)) brightness(0.6)',
            'drop-shadow(0 0 2px rgba(255, 59, 48, 0.1)) brightness(0.2)',
            'drop-shadow(0 0 14px rgba(255, 59, 48, 0.6)) brightness(0.7)',
            'drop-shadow(0 0 4px rgba(255, 59, 48, 0.2)) brightness(0.4)',
            'drop-shadow(0 0 18px rgba(255, 59, 48, 0.7)) brightness(0.8)',
            'drop-shadow(0 0 2px rgba(255, 59, 48, 0.1)) brightness(0.2)',
            'drop-shadow(0 0 12px rgba(255, 59, 48, 0.5)) brightness(0.6)',
            'drop-shadow(0 0 4px rgba(255, 59, 48, 0.2)) brightness(0.4)',
            'drop-shadow(0 0 14px rgba(255, 59, 48, 0.6)) brightness(0.7)',
            'drop-shadow(0 0 8px rgba(255, 59, 48, 0.4)) brightness(0.5)',
            'drop-shadow(0 0 20px rgba(255, 59, 48, 0.8)) brightness(0.9)',
            'drop-shadow(0 0 28px rgba(255, 59, 48, 0.95)) brightness(1.1)',
            'drop-shadow(0 0 32px rgba(255, 59, 48, 1)) brightness(1.2)',
            'drop-shadow(0 0 35px rgba(255, 59, 48, 1)) drop-shadow(0 0 60px rgba(255, 59, 48, 0.6)) brightness(1.3)',
            'drop-shadow(0 0 35px rgba(255, 59, 48, 1)) drop-shadow(0 0 60px rgba(255, 59, 48, 0.6)) brightness(1.3)',
            'drop-shadow(0 0 35px rgba(255, 59, 48, 1)) drop-shadow(0 0 60px rgba(255, 59, 48, 0.6)) brightness(1.3)',
            'drop-shadow(0 0 35px rgba(255, 59, 48, 1)) drop-shadow(0 0 60px rgba(255, 59, 48, 0.6)) brightness(1.3)',
            'drop-shadow(0 0 22px rgba(255, 59, 48, 0.7)) brightness(1.0)',
            'drop-shadow(0 0 8px rgba(255, 59, 48, 0.3)) brightness(0.5)',
            'drop-shadow(0 0 14px rgba(255, 59, 48, 0.5)) brightness(0.7)',
            'drop-shadow(0 0 2px rgba(255, 59, 48, 0.1)) brightness(0.2)',
            'drop-shadow(0 0 4px rgba(255, 59, 48, 0.2)) brightness(0.3)',
            'drop-shadow(0 0 1px rgba(255, 59, 48, 0.05)) brightness(0.1)',
            'drop-shadow(0 0 0px rgba(255, 59, 48, 0)) brightness(0.05)',
            'drop-shadow(0 0 0px rgba(255, 59, 48, 0)) brightness(0)',
          ],
        }}
        transition={{ 
          duration: 4.5,
          ease: 'linear',
          times: [
            0, 0.037, 0.074, 0.111, 0.148, 0.185, 0.222, 0.259, 0.296,
            0.333, 0.370, 0.407, 0.444, 0.481, 0.519, 0.556, 0.593, 0.630,
            0.667, 0.689, 0.711, 0.733, 0.756, 0.778, 0.800,
            0.825, 0.850, 0.875, 0.900, 0.925, 0.950, 0.975, 1
          ]
        }}
      />
    );
  }

  // Hero variant: neon sign flicker effect on load, instant glow on hover
  if (variant === 'hero') {
    return (
      <motion.img 
        src={logoSrc} 
        alt="BCUTZ" 
        className={cn(sizeClasses[size], 'object-contain cursor-pointer', className)}
        initial={{ opacity: 0, filter: 'brightness(0.2)' }}
        animate={{
          opacity: [0, 0, 0.6, 0.1, 0.8, 0.2, 0.9, 0.4, 1, 0.7, 1],
          filter: [
            'drop-shadow(0 0 0px rgba(255, 59, 48, 0)) brightness(0.2)',
            'drop-shadow(0 0 0px rgba(255, 59, 48, 0)) brightness(0.2)',
            'drop-shadow(0 0 15px rgba(255, 59, 48, 0.8)) brightness(1.3)',
            'drop-shadow(0 0 2px rgba(255, 59, 48, 0.1)) brightness(0.4)',
            'drop-shadow(0 0 25px rgba(255, 59, 48, 1)) brightness(1.4)',
            'drop-shadow(0 0 4px rgba(255, 59, 48, 0.2)) brightness(0.5)',
            'drop-shadow(0 0 20px rgba(255, 59, 48, 0.9)) brightness(1.3)',
            'drop-shadow(0 0 8px rgba(255, 59, 48, 0.4)) brightness(0.7)',
            'drop-shadow(0 0 30px rgba(255, 59, 48, 1)) brightness(1.5)',
            'drop-shadow(0 0 12px rgba(255, 59, 48, 0.6)) brightness(1.1)',
            'drop-shadow(0 0 0px rgba(0, 0, 0, 0)) brightness(1)',
          ],
        }}
        transition={{ duration: 2, ease: 'easeOut' }}
        whileHover={{ 
          scale: 1.05,
          filter: 'drop-shadow(0 0 15px rgba(255, 59, 48, 0.9)) drop-shadow(0 0 30px rgba(255, 59, 48, 0.5)) brightness(1.2)',
          transition: { duration: 0 }
        }}
        whileTap={{ scale: 0.98 }}
      />
    );
  }

  // Nav variant: instant glow on hover, neon fade out effect
  if (variant === 'nav') {
    return (
      <motion.img 
        src={logoSrc} 
        alt="BCUTZ" 
        className={cn(sizeClasses[size], 'object-contain cursor-pointer', className)}
        initial={false}
        animate={{ filter: 'drop-shadow(0 0 0px rgba(255, 59, 48, 0)) brightness(1)' }}
        transition={{ filter: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } }}
        whileHover={{ 
          scale: 1.05,
          filter: 'drop-shadow(0 0 10px rgba(255, 59, 48, 0.8)) drop-shadow(0 0 20px rgba(255, 59, 48, 0.4)) brightness(1.1)',
          transition: { duration: 0, filter: { duration: 0 } }
        }}
        whileTap={{ scale: 0.98 }}
      />
    );
  }

  // Static variant: no animations
  return (
    <img 
      src={logoSrc} 
      alt="BCUTZ" 
      className={cn(sizeClasses[size], 'object-contain', className)} 
    />
  );
}