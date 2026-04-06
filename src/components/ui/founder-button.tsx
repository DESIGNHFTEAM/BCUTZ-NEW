import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FounderButtonProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const glowColor = 'rgba(245, 158, 11, 1)';

const sizeStyles = {
  sm: 'h-9 px-3 text-xs',
  default: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
};

export function FounderButton({ 
  children, 
  className, 
  size = 'default', 
  showIcon = true, 
  disabled,
  onClick,
  type = 'button'
}: FounderButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold uppercase tracking-wider',
        'bg-gradient-to-r from-amber-500 to-yellow-400 text-black',
        'hover:from-amber-600 hover:to-yellow-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'rounded-none transition-colors',
        sizeStyles[size],
        className
      )}
      animate={{ 
        boxShadow: '0 0 0px transparent',
        scale: 1
      }}
      whileHover={{
        boxShadow: `0 0 18px ${glowColor.replace('1)', '0.6)')}, 0 0 36px ${glowColor.replace('1)', '0.4)')}, 0 0 54px ${glowColor.replace('1)', '0.2)')}`,
        scale: 1.02,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration: 0.25,
        ease: 'easeOut'
      }}
    >
      {showIcon && <Crown className="w-4 h-4" />}
      {children}
    </motion.button>
  );
}

// Link version using React Router's Link component
interface FounderButtonLinkProps {
  children: React.ReactNode;
  to: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export function FounderButtonLink({ 
  children, 
  to, 
  className, 
  size = 'default', 
  showIcon = true 
}: FounderButtonLinkProps) {
  return (
    <motion.div
      className="inline-block"
      animate={{ 
        boxShadow: '0 0 0px transparent',
        scale: 1
      }}
      whileHover={{
        boxShadow: `0 0 18px ${glowColor.replace('1)', '0.6)')}, 0 0 36px ${glowColor.replace('1)', '0.4)')}, 0 0 54px ${glowColor.replace('1)', '0.2)')}`,
        scale: 1.02,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration: 0.25,
        ease: 'easeOut'
      }}
    >
      <Link
        to={to}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold uppercase tracking-wider cursor-pointer',
          'bg-gradient-to-r from-amber-500 to-yellow-400 text-black',
          'hover:from-amber-600 hover:to-yellow-500',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
          'rounded-none transition-colors no-underline',
          sizeStyles[size],
          className
        )}
      >
        {showIcon && <Crown className="w-4 h-4" />}
        {children}
      </Link>
    </motion.div>
  );
}
