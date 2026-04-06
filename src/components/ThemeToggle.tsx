import { forwardRef } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export const ThemeToggle = forwardRef<HTMLButtonElement, { className?: string }>(
  ({ className }, ref) => {
    const { theme, setTheme, resolvedTheme } = useTheme();

    const cycleTheme = () => {
      if (theme === 'dark') {
        setTheme('light');
      } else if (theme === 'light') {
        setTheme('system');
      } else {
        setTheme('dark');
      }
    };

    const getTooltipText = () => {
      if (theme === 'dark') return 'Dark mode (click for Light)';
      if (theme === 'light') return 'Light mode (click for System)';
      return 'System mode (click for Dark)';
    };

    const getIcon = () => {
      if (theme === 'system') {
        return <Monitor className="h-4 w-4" />;
      }
      return resolvedTheme === 'dark' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      );
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            ref={ref}
            variant="outline" 
            size="icon" 
            glow={false}
            className={cn("h-8 w-8 border-border bg-background text-foreground hover:bg-secondary", className)}
            onClick={cycleTheme}
          >
            {getIcon()}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
);

ThemeToggle.displayName = 'ThemeToggle';
