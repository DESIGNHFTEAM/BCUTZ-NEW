import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight, Check, Calendar, DollarSign, Users, 
  TrendingUp, Shield, Smartphone, Scissors, Sparkles 
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NeonButtonLink } from '@/components/ui/neon-button';
import { PageTransition } from '@/components/animations/PageTransition';
import { getPathWithLanguage, LanguageCode } from '@/lib/i18n';

const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: customEase,
    },
  },
};

export default function ForProfessionals() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as LanguageCode;
  const getLocalizedPath = (path: string) => getPathWithLanguage(path, currentLang);

  const benefits = [
    {
      icon: Calendar,
      title: t('forProfessionals.benefits.scheduling.title'),
      description: t('forProfessionals.benefits.scheduling.description'),
    },
    {
      icon: DollarSign,
      title: t('forProfessionals.benefits.noFees.title'),
      description: t('forProfessionals.benefits.noFees.description'),
    },
    {
      icon: Users,
      title: t('forProfessionals.benefits.grow.title'),
      description: t('forProfessionals.benefits.grow.description'),
    },
    {
      icon: TrendingUp,
      title: t('forProfessionals.benefits.analytics.title'),
      description: t('forProfessionals.benefits.analytics.description'),
    },
    {
      icon: Shield,
      title: t('forProfessionals.benefits.payments.title'),
      description: t('forProfessionals.benefits.payments.description'),
    },
    {
      icon: Smartphone,
      title: t('forProfessionals.benefits.mobile.title'),
      description: t('forProfessionals.benefits.mobile.description'),
    },
  ];

  const steps = [
    {
      number: '01',
      title: t('forProfessionals.steps.profile.title'),
      description: t('forProfessionals.steps.profile.description'),
    },
    {
      number: '02',
      title: t('forProfessionals.steps.schedule.title'),
      description: t('forProfessionals.steps.schedule.description'),
    },
    {
      number: '03',
      title: t('forProfessionals.steps.earn.title'),
      description: t('forProfessionals.steps.earn.description'),
    },
  ];

  const features = [
    t('forProfessionals.pricing.features.unlimited'),
    t('forProfessionals.pricing.features.dashboard'),
    t('forProfessionals.pricing.features.customers'),
    t('forProfessionals.pricing.features.analytics'),
    t('forProfessionals.pricing.features.payouts'),
    t('forProfessionals.pricing.features.support'),
  ];

  const highlights = [
    t('forProfessionals.hero.noFees'),
    t('forProfessionals.hero.instantPayouts'),
    t('forProfessionals.hero.support'),
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
<main>
          {/* Hero */}
          <section className="pt-32 pb-24 relative overflow-hidden">
            {/* Grid Pattern */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.03 }}
              transition={{ duration: 2 }}
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                                 linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
                backgroundSize: '80px 80px',
              }}
            />

            <div className="container mx-auto px-4 relative">
              <Breadcrumbs />
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-4xl"
              >
                <motion.p
                  variants={itemVariants}
                  className="text-xs tracking-[0.3em] text-foreground/80 mb-6"
                >
                  {t('forProfessionals.hero.subtitle')}
                </motion.p>

                {/* Dual Icons */}
                <motion.div
                  variants={itemVariants}
                  className="flex items-center gap-6 mb-8"
                >
                  <div className="flex items-center gap-3 px-4 py-2 border border-border rounded-full">
                    <Scissors className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium tracking-wider text-foreground">{t('forProfessionals.hero.barbershops')}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 border border-border rounded-full">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium tracking-wider text-foreground">{t('forProfessionals.hero.beautySalons')}</span>
                  </div>
                </motion.div>

                <div className="overflow-hidden pt-2">
                  <motion.h1
                    variants={itemVariants}
                    className="font-display text-6xl md:text-8xl lg:text-9xl leading-normal tracking-wider mb-2"
                  >
                    {t('forProfessionals.hero.titleLine1')}
                  </motion.h1>
                </div>
                <div className="overflow-hidden">
                  <motion.h1
                    variants={itemVariants}
                    className="font-display text-6xl md:text-8xl lg:text-9xl leading-normal tracking-wider mb-8"
                  >
                    <span className="text-accent">{t('forProfessionals.hero.titleLine2')}</span>
                  </motion.h1>
                </div>

                <motion.div
                  variants={itemVariants}
                  className="w-24 h-[2px] bg-foreground mb-8"
                />

                <motion.p
                  variants={itemVariants}
                  className="text-lg md:text-xl text-foreground/80 mb-12 max-w-2xl"
                >
                  {t('forProfessionals.hero.description')}
                </motion.p>

                <motion.div
                  variants={itemVariants}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <NeonButtonLink to={getLocalizedPath('/auth?mode=signup&type=barber')} size="lg">
                    {t('forProfessionals.hero.joinButton')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </NeonButtonLink>
                  <NeonButtonLink to={getLocalizedPath('/contact')} variant="outline" size="lg">
                    {t('forProfessionals.hero.contactButton')}
                  </NeonButtonLink>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="flex flex-wrap items-center gap-8 mt-16"
                >
                  {highlights.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm tracking-wider text-foreground/80">
                      <div className="w-5 h-5 border-2 border-accent flex items-center justify-center">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      {item}
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-24 bg-foreground text-background">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl mb-16"
              >
                <p className="text-xs tracking-[0.3em] text-background/60 mb-4">{t('forProfessionals.benefits.subtitle')}</p>
                <h2 className="font-display text-background text-5xl md:text-6xl tracking-wider mb-6">
                  {t('forProfessionals.benefits.title')}
                </h2>
                <p className="text-background/85 text-lg">
                  {t('forProfessionals.benefits.description')}
                </p>
                <div className="w-16 h-[2px] bg-background mt-6" />
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-background/20">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, duration: 0.5 }}
                    className="p-8 md:p-10 bg-foreground group hover:bg-background hover:text-foreground transition-colors duration-300"
                  >
                    <div className="w-14 h-14 border-2 border-background group-hover:border-foreground flex items-center justify-center mb-6 transition-colors">
                      <benefit.icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-display text-background group-hover:text-foreground text-xl tracking-wider mb-3 transition-colors">{benefit.title}</h3>
                    <p className="text-background/80 group-hover:text-muted-foreground transition-colors">
                      {benefit.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-24">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl mb-16"
              >
                <p className="text-xs tracking-[0.3em] text-foreground/80 mb-4">{t('forProfessionals.steps.subtitle')}</p>
                <h2 className="font-display text-5xl md:text-6xl tracking-wider mb-6">
                  {t('forProfessionals.steps.title')}
                </h2>
                <div className="w-16 h-[2px] bg-foreground" />
              </motion.div>

              <div className="max-w-4xl">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15, duration: 0.5 }}
                    className="flex gap-8 mb-12 last:mb-0 group"
                  >
                    <div className="flex-shrink-0 w-20 h-20 border-2 border-foreground flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all duration-300">
                      <span className="font-display text-2xl text-foreground group-hover:text-background">
                        {step.number}
                      </span>
                    </div>
                    <div className="pt-2">
                      <h3 className="font-display text-2xl md:text-3xl tracking-wider mb-3">{step.title}</h3>
                      <p className="text-foreground/80 text-lg">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="py-24 bg-muted">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-16"
                >
                  <p className="text-xs tracking-[0.3em] text-foreground/80 mb-4">{t('forProfessionals.pricing.subtitle')}</p>
                  <h2 className="font-display text-5xl md:text-6xl tracking-wider mb-6">
                    {t('forProfessionals.pricing.title')}
                  </h2>
                  <p className="text-foreground/80 text-lg max-w-xl mx-auto">
                    {t('forProfessionals.pricing.description')}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="bg-background border-2 border-foreground p-10 md:p-16"
                >
                  <div className="text-center mb-10">
                    <span className="font-display text-7xl md:text-8xl text-foreground">
                      CHF 2
                    </span>
                    <span className="text-foreground/75 text-xl tracking-wider"> / {t('forProfessionals.pricing.perBooking')}</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-10">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-6 h-6 border-2 border-accent flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-sm tracking-wider text-foreground/90">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <NeonButtonLink to={getLocalizedPath('/auth?mode=signup&type=barber')} size="lg">
                      {t('forProfessionals.pricing.getStarted')}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </NeonButtonLink>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-32 bg-foreground text-background">
            {/* Grid Pattern */}
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.03 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--background)) 1px, transparent 1px),
                                 linear-gradient(90deg, hsl(var(--background)) 1px, transparent 1px)`,
                backgroundSize: '60px 60px',
              }}
            />

            <div className="container mx-auto px-4 text-center relative">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-16 h-[2px] bg-background mx-auto mb-10" />
                
                <h2 className="font-display text-background text-5xl md:text-7xl tracking-wider mb-6">
                  {t('forProfessionals.cta.title')}
                </h2>
                <p className="text-lg text-background/85 max-w-xl mx-auto mb-12">
                  {t('forProfessionals.cta.description')}
                </p>
                
                <NeonButtonLink 
                  to={getLocalizedPath('/auth?mode=signup&type=barber')} 
                  size="lg"
                  glowColor="rgba(255, 255, 255, 0.8)"
                  className="bg-background text-foreground hover:bg-background/90"
                >
                  {t('forProfessionals.cta.button')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </NeonButtonLink>
              </motion.div>
            </div>
          </section>
        </main>
</div>
    </PageTransition>
  );
}
