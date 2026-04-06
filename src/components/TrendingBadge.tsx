import { motion } from 'framer-motion';
import { TrendingUp, Flame, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendingBadgeProps {
  type: 'hot' | 'trending' | 'limited';
  className?: string;
}

const badgeConfig = {
  hot: {
    icon: Flame,
    text: 'HOT',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
    text_color: 'text-orange-500',
  },
  trending: {
    icon: TrendingUp,
    text: 'TRENDING',
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    text_color: 'text-green-500',
  },
  limited: {
    icon: Clock,
    text: 'LIMITED SLOTS',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    text_color: 'text-red-500',
  },
};

export function TrendingBadge({ type, className }: TrendingBadgeProps) {
  const config = badgeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-full border",
        config.bg,
        config.border,
        config.text_color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.text}
    </motion.div>
  );
}
