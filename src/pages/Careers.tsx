import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Briefcase, Send } from 'lucide-react';
import cutzLogo from '@/assets/cutz-logo.svg';

export default function Careers() {
  const { t } = useTranslation();

  const benefits = [
    { title: t('careers.competitivePay'), desc: t('careers.competitivePayDesc') },
    { title: t('careers.remoteFirst'), desc: t('careers.remoteFirstDesc') },
    { title: t('careers.growth'), desc: t('careers.growthDesc') },
  ];

  return (
    <div className="min-h-screen bg-background">
<main className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <p className="text-xs tracking-[0.3em] text-primary mb-4">{t('careers.tagline')}</p>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-wider mb-6 group cursor-default">
              {t('careers.title').split(' ').slice(0, -1).join(' ')}<br />
              <span className="inline-flex items-center justify-center gap-3">
                <img 
                  src={cutzLogo} 
                  alt="BCUTZ" 
                  className="h-12 md:h-16 inline-block drop-shadow-[0_0_10px_hsl(var(--gold)/0.5)] transition-all duration-300 group-hover:drop-shadow-[0_0_25px_hsl(var(--gold)/0.9)] group-hover:scale-110" 
                />
                <span>{t('careers.title').split(' ').slice(-1)[0]}</span>
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('careers.subtitle')}
            </p>
          </motion.div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 border border-border bg-card"
              >
                <h3 className="font-display font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* No Open Positions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-12 border border-border bg-card mb-16"
          >
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">{t('careers.noPositions')}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t('careers.noPositionsDesc')}
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 p-8 border border-primary/30 bg-primary/5 text-center"
          >
            <h3 className="font-display text-2xl font-bold mb-4">{t('careers.whyJoin')}</h3>
            <p className="text-muted-foreground mb-6">
              {t('careers.noPositionsDesc')}
            </p>
            <Button asChild>
              <a href="mailto:careers@bcutz.com?subject=Job Application - CV Submission&body=Hi BCUTZ Team,%0D%0A%0D%0AI am interested in joining your team. Please find my CV attached.%0D%0A%0D%0ABest regards">
                <Send className="w-4 h-4 mr-2" />
                {t('careers.sendCv')}
              </a>
            </Button>
          </motion.div>
        </div>
      </main>
</div>
  );
}
