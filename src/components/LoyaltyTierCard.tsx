import { Trophy, Award, Crown, Gem, Check, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export type TierLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

interface TierInfo {
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  multiplier: number;
  perks: string[];
}

export const LOYALTY_TIERS: Record<TierLevel, TierInfo> = {
  bronze: {
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 499,
    icon: Trophy,
    color: 'text-amber-700',
    bgColor: 'bg-amber-700/10',
    borderColor: 'border-amber-700/30',
    multiplier: 1,
    perks: ['Earn 1x points per CHF spent', 'Access to basic rewards', 'Birthday bonus: 50 points'],
  },
  silver: {
    name: 'Silver',
    minPoints: 500,
    maxPoints: 1499,
    icon: Award,
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/30',
    multiplier: 1.25,
    perks: ['Earn 1.25x points per CHF', 'Silver-exclusive rewards', 'Birthday bonus: 100 points', 'Free rescheduling'],
  },
  gold: {
    name: 'Gold',
    minPoints: 1500,
    maxPoints: 2999,
    icon: Crown,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    multiplier: 1.5,
    perks: ['Earn 1.5x points per CHF', 'Gold-exclusive rewards', 'Birthday bonus: 200 points', 'Free cancellation', '5% off all services'],
  },
  platinum: {
    name: 'Platinum',
    minPoints: 3000,
    maxPoints: null,
    icon: Gem,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/30',
    multiplier: 2,
    perks: ['Earn 2x points per CHF', 'All exclusive rewards', 'Birthday bonus: 500 points', 'Free cancellation & rescheduling', '10% off all services'],
  },
};

export function getPointMultiplier(tier: TierLevel): number {
  return LOYALTY_TIERS[tier].multiplier;
}

export function getBirthdayBonus(tier: TierLevel): number {
  switch (tier) {
    case 'platinum': return 500;
    case 'gold': return 200;
    case 'silver': return 100;
    default: return 50;
  }
}

export function getTierFromPoints(lifetimePoints: number): TierLevel {
  if (lifetimePoints >= 3000) return 'platinum';
  if (lifetimePoints >= 1500) return 'gold';
  if (lifetimePoints >= 500) return 'silver';
  return 'bronze';
}

export function getNextTier(currentTier: TierLevel): TierLevel | null {
  const tiers: TierLevel[] = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex < tiers.length - 1) {
    return tiers[currentIndex + 1];
  }
  return null;
}

interface LoyaltyTierCardProps {
  lifetimePoints: number;
  showPerks?: boolean;
}

export function LoyaltyTierCard({ lifetimePoints, showPerks = true }: LoyaltyTierCardProps) {
  const currentTier = getTierFromPoints(lifetimePoints);
  const tierInfo = LOYALTY_TIERS[currentTier];
  const nextTier = getNextTier(currentTier);
  const nextTierInfo = nextTier ? LOYALTY_TIERS[nextTier] : null;
  
  const TierIcon = tierInfo.icon;
  
  // Calculate progress to next tier
  let progressPercent = 100;
  let pointsToNext = 0;
  
  if (nextTierInfo) {
    const pointsInCurrentTier = lifetimePoints - tierInfo.minPoints;
    const tierRange = nextTierInfo.minPoints - tierInfo.minPoints;
    progressPercent = Math.min(100, (pointsInCurrentTier / tierRange) * 100);
    pointsToNext = nextTierInfo.minPoints - lifetimePoints;
  }

  return (
    <div className={`border-2 ${tierInfo.borderColor} ${tierInfo.bgColor} p-6`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 ${tierInfo.bgColor} border ${tierInfo.borderColor} flex items-center justify-center`}>
          <TierIcon className={`w-7 h-7 ${tierInfo.color}`} />
        </div>
        <div>
          <p className="text-xs tracking-widest text-muted-foreground">YOUR TIER</p>
          <h3 className={`font-display text-2xl tracking-wider ${tierInfo.color}`}>
            {tierInfo.name.toUpperCase()}
          </h3>
        </div>
      </div>
      
      {/* Multiplier Badge */}
      <div className={`flex items-center gap-2 p-3 mb-4 border ${tierInfo.borderColor} ${tierInfo.bgColor}`}>
        <Zap className={`w-5 h-5 ${tierInfo.color}`} />
        <span className="text-sm font-medium">
          <span className={tierInfo.color}>{tierInfo.multiplier}x</span> point multiplier on all bookings
        </span>
      </div>
      
      {nextTierInfo && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="tracking-widest text-muted-foreground">
              PROGRESS TO {nextTierInfo.name.toUpperCase()}
            </span>
            <span className={nextTierInfo.color}>{pointsToNext} pts needed</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}
      
      {!nextTierInfo && (
        <p className="text-sm text-muted-foreground mb-4">
          You've reached the highest tier! Enjoy all exclusive benefits.
        </p>
      )}
      
      {showPerks && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs tracking-widest text-muted-foreground mb-3">YOUR PERKS</p>
          <ul className="space-y-2">
            {tierInfo.perks.map((perk, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className={`w-4 h-4 ${tierInfo.color}`} />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface TierProgressOverviewProps {
  lifetimePoints: number;
}

export function TierProgressOverview({ lifetimePoints }: TierProgressOverviewProps) {
  const currentTier = getTierFromPoints(lifetimePoints);
  const tiers: TierLevel[] = ['bronze', 'silver', 'gold', 'platinum'];
  
  return (
    <div className="border-2 border-border p-6">
      <h3 className="font-display text-lg tracking-wider mb-6">TIER PROGRESSION</h3>
      <div className="space-y-4">
        {tiers.map((tier) => {
          const info = LOYALTY_TIERS[tier];
          const TierIcon = info.icon;
          const isActive = tier === currentTier;
          const isAchieved = lifetimePoints >= info.minPoints;
          
          return (
            <div 
              key={tier}
              className={`flex items-center gap-4 p-3 transition-all ${
                isActive ? `${info.bgColor} border ${info.borderColor}` : 
                isAchieved ? 'opacity-70' : 'opacity-40'
              }`}
            >
              <div className={`w-10 h-10 flex items-center justify-center ${
                isAchieved ? info.bgColor : 'bg-muted'
              }`}>
                <TierIcon className={`w-5 h-5 ${isAchieved ? info.color : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <p className={`font-display tracking-wider ${isActive ? info.color : ''}`}>
                  {info.name.toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {info.maxPoints ? `${info.minPoints} - ${info.maxPoints} pts` : `${info.minPoints}+ pts`}
                </p>
              </div>
              {isActive && (
                <span className={`text-xs tracking-widest ${info.color}`}>CURRENT</span>
              )}
              {isAchieved && !isActive && (
                <Check className={`w-5 h-5 ${info.color}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
