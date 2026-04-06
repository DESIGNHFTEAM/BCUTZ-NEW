import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface AdminBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export function AdminBadge({ className = '', showTooltip = true }: AdminBadgeProps) {
  const badge = (
    <motion.div
      whileHover={{
        filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.5)) drop-shadow(0 0 12px rgba(245, 158, 11, 0.25))',
      }}
      transition={{ duration: 0.2 }}
    >
      <Badge 
        variant="secondary" 
        className={`bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 cursor-default ${className}`}
      >
        <Shield className="w-3 h-3" />
        Admin
      </Badge>
    </motion.div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p>Verified CUTZ Administrator</p>
      </TooltipContent>
    </Tooltip>
  );
}
