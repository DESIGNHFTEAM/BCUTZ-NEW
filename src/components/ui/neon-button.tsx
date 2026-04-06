import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// FOMO-based glow presets
const glowPresets = {
  // High urgency - bright red glow (booking, limited offers)
  urgent: {
    color: 'rgba(255, 59, 48, 1)',
    intensity: 1.5,
  },
  // Primary action - standard red glow
  primary: {
    color: 'rgba(255, 59, 48, 1)',
    intensity: 1,
  },
  // Secondary - white/neutral glow
  secondary: {
    color: 'rgba(255, 255, 255, 1)',
    intensity: 0.8,
  },
  // Premium - amber/orange glow (founder-style, special features)
  premium: {
    color: 'rgba(245, 158, 11, 1)',
    intensity: 1.2,
  },
  // Subtle - dim white glow (low priority actions)
  subtle: {
    color: 'rgba(255, 255, 255, 1)',
    intensity: 0.4,
  },
  // Success - green glow
  success: {
    color: 'rgba(34, 197, 94, 1)',
    intensity: 1,
  },
  // Dark - dark/black subtle glow (for light mode)
  dark: {
    color: 'rgba(0, 0, 0, 1)',
    intensity: 0.6,
  },
} as const;

type GlowPreset = keyof typeof glowPresets;

interface NeonButtonLinkProps {
  children: React.ReactNode;
  to: string;
  className?: string;
  variant?: 'primary' | 'outline';
  size?: 'default' | 'lg';
  glow?: GlowPreset;
  glowColor?: string;
}

export function NeonButtonLink({ 
  children, 
  to,
  className,
  variant = 'primary',
  size = 'default',
  glow = 'primary',
  glowColor,
}: NeonButtonLinkProps) {
  const navigate = useNavigate();
  
  const preset = glowPresets[glow];
  const finalGlowColor = glowColor || preset.color;
  const intensity = preset.intensity;
  
  const baseStyles = cn(
    'inline-flex items-center justify-center font-semibold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
    size === 'default' && 'h-12 px-6 text-sm',
    size === 'lg' && 'h-14 px-10 text-sm',
    variant === 'primary' && 'bg-foreground text-background hover:bg-foreground/90',
    variant === 'outline' && 'border-2 border-foreground text-foreground bg-transparent hover:bg-foreground hover:text-background',
    'rounded-none',
    className
  );

  const handleClick = () => {
    window.scrollTo(0, 0);
    navigate(to);
  };

  // Calculate glow values based on intensity
  const glowSizes = {
    sm: 12 * intensity,
    md: 25 * intensity,
    lg: 40 * intensity,
  };

  return (
    <motion.div
      animate={{ 
        filter: 'drop-shadow(0 0 0px transparent)',
        scale: 1
      }}
      whileHover={{
        filter: `drop-shadow(0 0 ${glowSizes.sm}px ${finalGlowColor.replace('1)', `${0.8 * intensity})`)}) drop-shadow(0 0 ${glowSizes.md}px ${finalGlowColor.replace('1)', `${0.5 * intensity})`)}) drop-shadow(0 0 ${glowSizes.lg}px ${finalGlowColor.replace('1)', `${0.2 * intensity})`)})`,
        scale: 1.02,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration: 0.25,
        ease: 'easeOut'
      }}
      onClick={handleClick}
      className={baseStyles}
    >
      {children}
    </motion.div>
  );
}

interface NeonButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'outline';
  size?: 'default' | 'lg';
  glow?: GlowPreset;
  glowColor?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function NeonButton({ 
  children, 
  className,
  variant = 'primary',
  size = 'default',
  glow = 'primary',
  glowColor,
  onClick,
  disabled,
  type = 'button',
}: NeonButtonProps) {
  const preset = glowPresets[glow];
  const finalGlowColor = glowColor || preset.color;
  const intensity = preset.intensity;

  const baseStyles = cn(
    'inline-flex items-center justify-center font-semibold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    size === 'default' && 'h-12 px-6 text-sm',
    size === 'lg' && 'h-14 px-10 text-sm',
    variant === 'primary' && 'bg-foreground text-background hover:bg-foreground/90',
    variant === 'outline' && 'border-2 border-foreground text-foreground bg-transparent hover:bg-foreground hover:text-background',
    'rounded-none',
    className
  );

  // Calculate glow values based on intensity
  const glowSizes = {
    sm: 15 * intensity,
    md: 30 * intensity,
    lg: 45 * intensity,
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseStyles}
      animate={{ 
        boxShadow: '0 0 0px transparent',
        scale: 1
      }}
      whileHover={{
        boxShadow: `0 0 ${glowSizes.sm}px ${finalGlowColor.replace('1)', `${0.6 * intensity})`)}, 0 0 ${glowSizes.md}px ${finalGlowColor.replace('1)', `${0.4 * intensity})`)}, 0 0 ${glowSizes.lg}px ${finalGlowColor.replace('1)', `${0.2 * intensity})`)}`,
        scale: 1.02,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration: 0.25,
        ease: 'easeOut'
      }}
    >
      {children}
    </motion.button>
  );
}
