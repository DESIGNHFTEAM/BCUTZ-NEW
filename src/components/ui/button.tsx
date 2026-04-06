import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Haptic feedback helper
const triggerHaptic = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    // Haptics not available
  }
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  glow?: boolean;
  glowColor?: string;
  haptic?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, glow = true, glowColor, haptic = true, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // Determine glow color based on variant
    const defaultGlowColor = 'rgba(255, 59, 48, 0.5)';
    const finalGlowColor = glowColor || defaultGlowColor;

    // Wrap onClick with haptic feedback
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic) {
        triggerHaptic();
      }
      props.onClick?.(e);
    }, [haptic, props.onClick]);
    
    // For asChild buttons, we CANNOT wrap in motion.div as it breaks ref forwarding
    // for Radix UI triggers (PopoverTrigger, DropdownMenuTrigger, etc.)
    // Just render the Slot directly - the child handles its own effects
    if (asChild) {
      return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
    }
    
    // For regular buttons with glow
    if (glow) {
      const { disabled, type, children } = props;
      return (
        <motion.button
          className={cn(buttonVariants({ variant, size, className }), "relative overflow-hidden")}
          ref={ref}
          onClick={handleClick}
          disabled={disabled}
          type={type}
          animate={{ 
            boxShadow: '0 0 0px transparent',
            scale: 1
          }}
          whileHover={{
            boxShadow: `0 0 12px ${finalGlowColor}, 0 0 25px ${finalGlowColor.replace('0.5)', '0.3)')}, 0 0 40px ${finalGlowColor.replace('0.5)', '0.15)')}`,
            scale: 1.02,
          }}
          whileTap={{ scale: 0.98 }}
          transition={{
            duration: 0.25,
            ease: 'easeOut'
          }}
        >
          <motion.span
            className="absolute inset-0 opacity-0 pointer-events-none"
            initial={{ x: '-100%' }}
            whileHover={{ 
              x: '100%',
              opacity: 0.2,
            }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            style={{
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
            }}
          />
          <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        </motion.button>
      );
    }
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        {...props}
        onClick={handleClick}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
