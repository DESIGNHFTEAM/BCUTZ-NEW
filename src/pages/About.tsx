import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Users, Target, Heart, Award } from 'lucide-react';

export default function About() {
  const { t } = useTranslation();

  const values = [
    { icon: Users, title: t('about.values.community.title'), desc: t('about.values.community.description') },
    { icon: Target, title: t('about.values.quality.title'), desc: t('about.values.quality.description') },
    { icon: Heart, title: t('about.values.passion.title'), desc: t('about.values.passion.description') },
    { icon: Award, title: t('about.values.excellence.title'), desc: t('about.values.excellence.description') },
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
            <p className="text-xs tracking-[0.3em] text-primary mb-4">{t('about.subtitle')}</p>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-wider mb-6">
              {t('about.titleLine1')}<br />
              <span className="text-gradient-gold">{t('about.titleLine2')}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('about.description')}
            </p>
          </motion.div>

          {/* Values */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {values.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 border border-border bg-card text-center"
              >
                <item.icon className="w-8 h-8 mx-auto mb-4 text-primary" />
                <h3 className="font-display font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Story */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="font-display text-3xl font-bold mb-6">{t('about.story.title')}</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t('about.story.paragraph1')}</p>
              <p>{t('about.story.paragraph2')}</p>
              <p>{t('about.story.paragraph3')}</p>
            </div>
          </motion.div>
        </div>
      </main>
</div>
  );
}
