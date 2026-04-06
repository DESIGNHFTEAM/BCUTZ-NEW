import { Scissors } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface BarberBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export function BarberBadge({ className = '', showTooltip = true }: BarberBadgeProps) {
  const { t } = useTranslation();
  
  const badge = (
    <motion.div
      className="inline-block"
      whileHover={{
        filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6)) drop-shadow(0 0 16px rgba(16, 185, 129, 0.3))',
      }}
      transition={{ duration: 0.2 }}
    >
      <Badge 
        className={`bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-0 gap-1 font-semibold ${className}`}
      >
        <Scissors className="w-3 h-3" />
        {t('barbers.barber')}
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
        <p>{t('barbers.verified')} CUTZ {t('barbers.barber')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
