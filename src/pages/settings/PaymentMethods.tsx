import { motion } from 'framer-motion';
import { 
  ArrowLeft, CreditCard, Shield, Smartphone, Info, Lock, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageTransition } from '@/components/animations/PageTransition';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPathWithLanguage, getLanguageFromPath } from '@/lib/i18n';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function PaymentMethods() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  
  // Helper to get localized path
  const currentLang = getLanguageFromPath(location.pathname);
  const localizedPath = (path: string) => getPathWithLanguage(path, currentLang);

  const supportedPaymentMethods = [
    {
      name: t('settings.paymentMethodsPage.creditDebit'),
      icon: CreditCard,
      description: t('settings.paymentMethodsPage.creditDebitDesc'),
      highlight: t('settings.paymentMethodsPage.mostPopular'),
    },
    {
      name: t('settings.paymentMethodsPage.twintName'),
      icon: Smartphone,
      description: t('settings.paymentMethodsPage.twintDesc'),
      highlight: t('settings.paymentMethodsPage.swissFavorite'),
    },
    {
      name: t('settings.paymentMethodsPage.klarnaName'),
      icon: CreditCard,
      description: t('settings.paymentMethodsPage.klarnaDesc'),
      highlight: t('settings.paymentMethodsPage.flexible'),
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
<main className="pt-32 pb-24">
          <div className="container mx-auto px-4 max-w-2xl">
            <Breadcrumbs />
            
            <Link 
              to={localizedPath("/profile")} 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('settings.backToProfile')}
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: customEase }}
              className="font-display text-4xl md:text-5xl tracking-wider mb-4"
            >
              {t('settings.paymentMethodsPage.title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: customEase, delay: 0.1 }}
              className="text-muted-foreground mb-8"
            >
              {t('settings.paymentMethodsPage.subtitle')}
            </motion.p>

            {/* Security Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: customEase, delay: 0.2 }}
            >
              <Alert className="mb-8 border-primary/30 bg-primary/5">
                <Shield className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <strong>{t('settings.paymentMethodsPage.securityTitle')}</strong><br />
                  {t('settings.paymentMethodsPage.securityDesc')}
                </AlertDescription>
              </Alert>
            </motion.div>

            {/* How Payments Work */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: customEase, delay: 0.3 }}
            >
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    {t('settings.paymentMethodsPage.howItWorksTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.paymentMethodsPage.howItWorksSubtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">{t('settings.paymentMethodsPage.step1Title')}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.paymentMethodsPage.step1Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">{t('settings.paymentMethodsPage.step2Title')}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.paymentMethodsPage.step2Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">{t('settings.paymentMethodsPage.step3Title')}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.paymentMethodsPage.step3Desc')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Supported Payment Methods */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: customEase, delay: 0.4 }}
            >
              <h2 className="font-display text-xl tracking-wider mb-4">{t('settings.paymentMethodsPage.acceptedMethods')}</h2>
              <div className="space-y-4">
                {supportedPaymentMethods.map((method, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="border-2 border-border p-6 flex items-center justify-between hover:border-foreground transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 border-2 border-border flex items-center justify-center">
                        <method.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-display tracking-wider">{method.name}</p>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {method.highlight}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* TWINT Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: customEase, delay: 0.8 }}
              className="mt-8"
            >
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    {t('settings.paymentMethodsPage.twintPaymentsTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>{t('settings.paymentMethodsPage.twintPaymentsDesc1')}</p>
                  <p><strong>{t('settings.paymentMethodsPage.twintPaymentsDesc2')}</strong></p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: customEase, delay: 0.9 }}
              className="mt-8 pt-8 border-t border-border"
            >
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>{t('settings.paymentMethodsPage.securityFooter1')}</span>
                <span>•</span>
                <span>{t('settings.paymentMethodsPage.securityFooter2')}</span>
                <span>•</span>
                <span>{t('settings.paymentMethodsPage.securityFooter3')}</span>
              </div>
            </motion.div>
          </div>
        </main>
</div>
    </PageTransition>
  );
}