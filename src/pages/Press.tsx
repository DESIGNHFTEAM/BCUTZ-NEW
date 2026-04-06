import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Newspaper, Download, Mail, ExternalLink } from 'lucide-react';

// Press releases - add new entries here
const pressReleases: Array<{
  date: string;
  title: string;
  excerpt: string;
  link?: string;
}> = [];

// Media highlights - add new entries here  
const mediaHighlights: Array<{
  outlet: string;
  title: string;
  link?: string;
}> = [];

export default function Press() {
  const { t } = useTranslation();

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
            <p className="text-xs tracking-[0.3em] text-primary mb-4">{t('press.tagline')}</p>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-wider mb-6">
              {t('press.title').split(' ')[0]} &<br />
              <span className="text-gradient-gold">{t('press.title').split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('press.subtitle')}
            </p>
          </motion.div>

          {/* Press Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 border border-primary/30 bg-primary/5 mb-12 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <Mail className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-display font-bold">{t('press.contactTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('press.contactDesc')}</p>
              </div>
            </div>
            <Button asChild>
              <a href={`mailto:${t('press.contactEmail')}`}>
                {t('press.contactEmail')}
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Press Releases */}
            <div className="lg:col-span-2">
              <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
                <Newspaper className="w-6 h-6" />
                {t('press.inTheNews')}
              </h2>
              {pressReleases.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-12 border-2 border-dashed border-border text-center"
                >
                  <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground tracking-wider">{t('press.comingSoon')}</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {pressReleases.map((release, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="p-6 border border-border bg-card"
                    >
                      <p className="text-xs tracking-wider text-primary mb-2">{release.date}</p>
                      <h3 className="font-display font-bold text-lg mb-2">{release.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{release.excerpt}</p>
                      {release.link && (
                        <Button variant="link" className="p-0 h-auto" asChild>
                          <a href={release.link} target="_blank" rel="noopener noreferrer">
                            {t('common.learnMore')}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Media Highlights */}
              <div>
                <h3 className="font-display text-xl font-bold mb-4">{t('press.inTheNews')}</h3>
                {mediaHighlights.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 border-2 border-dashed border-border text-center"
                  >
                    <p className="text-sm text-muted-foreground">{t('press.comingSoon')}</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {mediaHighlights.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="p-4 border border-border bg-card"
                      >
                        <p className="text-xs tracking-wider text-muted-foreground mb-1">{item.outlet}</p>
                        <p className="font-medium text-sm">{item.title}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Media Kit */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 border border-border bg-card"
              >
                <Download className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-display font-bold mb-2">{t('press.pressKitTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('press.pressKitDesc')}
                </p>
                <Button variant="outline" className="w-full" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  {t('common.comingSoon')}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
</div>
  );
}
