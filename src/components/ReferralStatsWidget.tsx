import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Gift, TrendingUp, Share2, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalPointsEarned: number;
  conversionRate: number;
}

export function ReferralStatsWidget() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    setIsLoading(true);

    // Fetch referrals
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user?.id);

    if (error) {
      console.error('Error fetching referral stats:', error);
      setIsLoading(false);
      return;
    }

    if (referrals && referrals.length > 0) {
      setReferralCode(referrals[0].referral_code);

      const totalReferrals = referrals.filter(r => r.referred_user_id !== null).length;
      const pendingReferrals = referrals.filter(r => r.status === 'signed_up').length;
      const completedReferrals = referrals.filter(r => r.status === 'rewarded').length;
      const totalPointsEarned = referrals.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
      const conversionRate = totalReferrals > 0 
        ? Math.round((completedReferrals / totalReferrals) * 100) 
        : 0;

      setStats({
        totalReferrals,
        pendingReferrals,
        completedReferrals,
        totalPointsEarned,
        conversionRate,
      });
    } else {
      setStats({
        totalReferrals: 0,
        pendingReferrals: 0,
        completedReferrals: 0,
        totalPointsEarned: 0,
        conversionRate: 0,
      });
    }

    setIsLoading(false);
  };

  const generateCode = async () => {
    const { data, error } = await supabase.rpc('get_or_create_referral_code');
    
    if (error) {
      toast.error('Failed to generate referral code');
    } else if (data) {
      setReferralCode(data);
      toast.success('Referral code generated!');
      fetchStats();
    }
  };

  const handleCopy = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      setIsCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 border border-border bg-card">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 border border-border bg-card"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-bold tracking-wider flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          REFERRAL PROGRAM
        </h3>
        {referralCode && (
          <div className="flex items-center gap-2">
            <code className="px-2 py-1 bg-muted text-xs font-mono tracking-wider">
              {referralCode}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 w-7"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>

      {!referralCode ? (
        <div className="text-center py-6">
          <Share2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Get your referral code and earn 50 points for each friend who books!
          </p>
          <Button onClick={generateCode} size="sm">
            <Gift className="w-4 h-4 mr-2" />
            Get Referral Code
          </Button>
        </div>
      ) : stats && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/30 border border-border text-center">
              <p className="text-2xl font-display font-bold">{stats.totalReferrals}</p>
              <p className="text-xs text-muted-foreground tracking-wider">TOTAL SIGNUPS</p>
            </div>
            <div className="p-3 bg-muted/30 border border-border text-center">
              <p className="text-2xl font-display font-bold text-green-500">+{stats.totalPointsEarned}</p>
              <p className="text-xs text-muted-foreground tracking-wider">POINTS EARNED</p>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Conversion Rate</span>
              <span className="font-bold">{stats.conversionRate}%</span>
            </div>
            <Progress value={stats.conversionRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.pendingReferrals} pending</span>
              <span>{stats.completedReferrals} completed</span>
            </div>
          </div>

          {/* Quick Share */}
          <Button 
            onClick={handleCopy} 
            variant="outline" 
            className="w-full"
            size="sm"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Your Code
          </Button>
        </div>
      )}
    </motion.div>
  );
}
