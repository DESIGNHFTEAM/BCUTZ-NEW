import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface FounderBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export function FounderBadge({ className = '', showTooltip = true }: FounderBadgeProps) {
  const badge = (
    <motion.div
      whileHover={{
        filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6)) drop-shadow(0 0 16px rgba(245, 158, 11, 0.3))',
      }}
      transition={{ duration: 0.2 }}
    >
      <Badge 
        className={`bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 border-0 gap-1 font-semibold cursor-default ${className}`}
      >
        <Crown className="w-3 h-3" />
        Founder
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
        <p>CUTZ Founder • Full Platform Access</p>
      </TooltipContent>
    </Tooltip>
  );
}
