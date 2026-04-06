import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Clock } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

export default function LoyaltyProgram() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
<main className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          {/* Coming Soon Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center py-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{t('loyalty.comingSoon.title')}</span>
            </div>
            
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
              <Gift className="w-12 h-12 text-primary" />
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-wider mb-4">
              {t('loyaltyProgram.title')}<br />
              <span className="text-gradient-gold">{t('loyalty.comingSoon.title')}</span>
            </h1>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              {t('loyalty.comingSoon.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/barbers')} className="bg-gradient-gold">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('common.findBarbers')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                {t('common.back')}
              </Button>
            </div>
            
            {/* Feature Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                { title: t('loyalty.comingSoon.features.rewards'), icon: Gift },
                { title: t('loyalty.comingSoon.features.tiers'), icon: Sparkles },
                { title: t('loyalty.comingSoon.features.birthday'), icon: Gift },
                { title: t('loyalty.comingSoon.features.referrals'), icon: Sparkles },
              ].map((feature, i) => (
                <div key={i} className="p-4 border border-border/50 bg-card/50 text-center opacity-60">
                  <feature.icon className="w-6 h-6 mx-auto mb-2 text-primary/60" />
                  <h3 className="font-display font-bold text-sm">{feature.title}</h3>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </main>
</div>
  );
}
