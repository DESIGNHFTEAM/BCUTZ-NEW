import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { NeonButtonLink } from '@/components/ui/neon-button';
import { getPathWithLanguage, getLanguageFromPath } from '@/lib/i18n';

// Use tuple type for cubic bezier easing
const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 60,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.7,
      ease: customEase,
    },
  },
};

const lineVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      duration: 1,
      ease: customEase,
      delay: 0.3,
    },
  },
};

export function CTASection() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentLang = getLanguageFromPath(location.pathname);

  return (
    <section className="py-32 relative overflow-hidden bg-foreground text-background">
      {/* Background Pattern */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.03 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--background)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--background)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container mx-auto px-4 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            variants={lineVariants}
            className="w-16 h-[2px] bg-background mx-auto mb-10 origin-center"
          />
          
          <div className="overflow-hidden pt-2">
            <motion.h2 
              variants={itemVariants}
              className="font-display text-background text-5xl md:text-7xl lg:text-8xl mb-2 tracking-wider leading-normal"
            >
              {t('cta.readyForYour')}
            </motion.h2>
          </div>
          <div className="overflow-hidden">
            <motion.h2 
              variants={itemVariants}
              className="font-display text-background text-5xl md:text-7xl lg:text-8xl mb-8 tracking-wider leading-tight"
            >
              {t('cta.bestCut')}
            </motion.h2>
          </div>

          <motion.p 
            variants={itemVariants}
            className="text-lg text-background/85 max-w-xl mx-auto mb-12"
          >
            {t('cta.subtitle')}
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <NeonButtonLink 
              to={getPathWithLanguage('/barbers', currentLang)} 
              size="lg"
              glow="urgent"
              className="bg-background text-foreground hover:bg-background/90"
            >
              {t('cta.findBarber')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </NeonButtonLink>
            <NeonButtonLink 
              to={getPathWithLanguage('/for-professionals', currentLang)} 
              variant="outline"
              size="lg"
              glow="premium"
              className="border-background text-background hover:bg-background hover:text-foreground"
            >
              {t('cta.joinAsProfessional')}
            </NeonButtonLink>
          </motion.div>

          <motion.p 
            variants={itemVariants}
            className="mt-10 text-sm text-background/50 tracking-widest uppercase"
          >
            {t('cta.noSubscriptionFees')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
