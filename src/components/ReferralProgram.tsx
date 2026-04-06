import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Users, Gift, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Referral {
  id: string;
  referral_code: string;
  referred_user_id: string | null;
  status: string;
  points_awarded: number;
  created_at: string;
  completed_at: string | null;
}

export function ReferralProgram() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    setIsLoading(true);
    
    // Fetch user's referrals
    const { data: referralsData } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user?.id)
      .order('created_at', { ascending: false });

    if (referralsData && referralsData.length > 0) {
      setReferrals(referralsData);
      setReferralCode(referralsData[0].referral_code);
    }
    
    setIsLoading(false);
  };

  const generateReferralCode = async () => {
    setIsGenerating(true);
    
    const { data, error } = await supabase.rpc('get_or_create_referral_code');
    
    if (error) {
      console.error('Error generating referral code:', error);
      toast.error('Failed to generate referral code');
    } else if (data) {
      setReferralCode(data);
      fetchReferralData();
      toast.success('Referral code generated!');
    }
    
    setIsGenerating(false);
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      setIsCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;
    
    const shareText = `Get CHF 50 bonus points when you book your first haircut on BCUTZ! Use my referral code: ${referralCode}`;
    const shareUrl = `https://bcutz.lovable.app/auth?ref=${referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BCUTZ',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        handleCopyCode();
      }
    } else {
      handleCopyCode();
    }
  };

  const completedReferrals = referrals.filter(r => r.status === 'rewarded');
  const pendingReferrals = referrals.filter(r => r.status === 'signed_up');
  const totalEarned = completedReferrals.reduce((sum, r) => sum + r.points_awarded, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse" />
        <div className="h-24 bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent"
      >
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold tracking-wider">INVITE FRIENDS</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          Share your code and you both earn <strong className="text-primary">50 points</strong> when 
          they complete their first booking!
        </p>
        
        {referralCode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-muted font-mono text-lg tracking-widest text-center border-2 border-border">
                {referralCode}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyCode}
                className="h-12 w-12 border-2"
              >
                {isCopied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            <Button
              onClick={handleShare}
              className="w-full h-12 tracking-wider"
            >
              <Share2 className="w-4 h-4 mr-2" />
              SHARE WITH FRIENDS
            </Button>
          </div>
        ) : (
          <Button
            onClick={generateReferralCode}
            disabled={isGenerating}
            className="w-full h-12 tracking-wider"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                GENERATING...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                GET YOUR REFERRAL CODE
              </>
            )}
          </Button>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border border-border bg-card text-center">
          <p className="text-2xl font-display font-bold text-gradient-gold">{completedReferrals.length}</p>
          <p className="text-xs text-muted-foreground tracking-wider">COMPLETED</p>
        </div>
        <div className="p-4 border border-border bg-card text-center">
          <p className="text-2xl font-display font-bold">{pendingReferrals.length}</p>
          <p className="text-xs text-muted-foreground tracking-wider">PENDING</p>
        </div>
        <div className="p-4 border border-border bg-card text-center">
          <p className="text-2xl font-display font-bold text-green-500">+{totalEarned}</p>
          <p className="text-xs text-muted-foreground tracking-wider">POINTS EARNED</p>
        </div>
      </div>

      {/* Referral History */}
      {referrals.filter(r => r.status !== 'pending' || r.referred_user_id).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4" />
            REFERRAL HISTORY
          </h4>
          {referrals
            .filter(r => r.status !== 'pending' || r.referred_user_id)
            .map((referral) => (
              <div
                key={referral.id}
                className="p-4 border border-border bg-card flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {referral.status === 'rewarded' ? 'Friend completed booking' :
                     referral.status === 'completed' ? 'Awaiting reward' :
                     referral.status === 'signed_up' ? 'Friend signed up' :
                     'Invitation sent'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {referral.points_awarded > 0 && (
                    <span className="text-sm font-bold text-green-500">
                      +{referral.points_awarded}
                    </span>
                  )}
                  <Badge variant={
                    referral.status === 'rewarded' ? 'default' :
                    referral.status === 'signed_up' ? 'secondary' :
                    'outline'
                  }>
                    {referral.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* How it works */}
      <div className="p-4 bg-muted/30 border border-border">
        <h4 className="text-xs font-medium text-muted-foreground tracking-wider mb-3">HOW IT WORKS</h4>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">1</span>
            <span>Share your unique referral code with friends</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">2</span>
            <span>They sign up using your code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">3</span>
            <span>When they complete their first booking, you both earn 50 points!</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
