import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Check, Scissors, CreditCard, Wallet, Globe, ShieldCheck } from 'lucide-react';
import { getSupportedCurrencies } from '@/lib/feeCalculator';
import { FAQSchema } from '@/components/seo/FAQSchema';

export default function Pricing() {
  const { t } = useTranslation();
  const supportedCurrencies = getSupportedCurrencies();

  // FAQ content for schema markup
  const pricingFaqs = [
    {
      question: 'How much does BCUTZ cost for customers?',
      answer: 'Customers pay a fixed service fee of CHF 2.00 per booking. Browsing barbers and creating an account is completely free.',
    },
    {
      question: 'How much does BCUTZ cost for barbers?',
      answer: 'BCUTZ is free to join for professionals. There are no monthly fees or setup costs. We only take a small commission when you successfully complete a booking.',
    },
    {
      question: 'What currencies does BCUTZ support?',
      answer: 'BCUTZ supports multiple currencies including CHF, EUR, USD, GBP, and more. Prices are displayed in your local currency with transparent exchange rates.',
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept credit cards, debit cards, TWINT, PayPal, and Klarna. All payments are processed securely through Stripe with PCI DSS compliance.',
    },
    {
      question: 'How do barbers receive their payments?',
      answer: 'Barbers receive automatic weekly payouts directly to their bank account. Earnings are calculated after deducting the platform commission.',
    },
  ];

  const customerFeatures = [
    t('pricing.customers.features.browse'),
    t('pricing.customers.features.secure'),
    t('pricing.customers.features.loyalty'),
    t('pricing.customers.features.reminders'),
    t('pricing.customers.features.review'),
  ];

  const barberFeatures = [
    t('pricing.barbers.features.profile'),
    t('pricing.barbers.features.unlimited'),
    t('pricing.barbers.features.payouts'),
    t('pricing.barbers.features.management'),
    t('pricing.barbers.features.analytics'),
    t('pricing.barbers.features.verified'),
  ];

  return (
    <div className="min-h-screen bg-background">
      <FAQSchema faqs={pricingFaqs} />
<main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-6">
              {t('pricing.title')}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-card border border-border p-8 rounded-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl tracking-wider">{t('pricing.customers.title')}</h3>
                  <p className="text-muted-foreground text-sm">{t('pricing.customers.subtitle')}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <span className="font-display text-4xl">CHF 2.–</span>
                <span className="text-muted-foreground ml-2">{t('pricing.customers.fee')}</span>
              </div>
              
              <p className="text-muted-foreground mb-4">{t('pricing.customers.description')}</p>
              <p className="text-xs text-muted-foreground mb-6 italic">
                Fixed service fee per booking. Transparent and simple pricing.
              </p>
              
              <ul className="space-y-3">
                {customerFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-card border border-primary p-8 rounded-lg relative"
            >
              <div className="absolute -top-3 right-6 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium tracking-wider">
                {t('pricing.barbers.badge')}
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl tracking-wider">{t('pricing.barbers.title')}</h3>
                  <p className="text-muted-foreground text-sm">{t('pricing.barbers.subtitle')}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <span className="font-display text-4xl">{t('pricing.barbers.price')}</span>
                <span className="text-muted-foreground ml-2">{t('pricing.barbers.priceNote')}</span>
              </div>
              
              <p className="text-muted-foreground mb-6">{t('pricing.barbers.description')}</p>
              
              <ul className="space-y-3">
                {barberFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="max-w-4xl mx-auto mb-16"
          >
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Globe className="w-6 h-6 text-primary" />
                <h2 className="font-display text-2xl tracking-wider">International Support</h2>
              </div>
              <p className="text-muted-foreground">Pay in your local currency with transparent pricing</p>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
              {supportedCurrencies.map((currency) => (
                <div 
                  key={currency.code}
                  className="bg-card border border-border p-3 rounded-lg text-center hover:border-primary transition-colors"
                >
                  <span className="font-display text-lg">{currency.symbol}</span>
                  <p className="text-xs text-muted-foreground mt-1">{currency.code}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-2xl tracking-wider mb-8">{t('pricing.paymentMethods.title')}</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-3 bg-card border border-border px-6 py-4 rounded-lg">
                <CreditCard className="w-6 h-6 text-primary" />
                <span className="font-medium">{t('pricing.paymentMethods.card')}</span>
              </div>
              <div className="flex items-center gap-3 bg-card border border-border px-6 py-4 rounded-lg">
                <Wallet className="w-6 h-6 text-primary" />
                <span className="font-medium">TWINT</span>
              </div>
              <div className="flex items-center gap-3 bg-card border border-border px-6 py-4 rounded-lg">
                <CreditCard className="w-6 h-6 text-primary" />
                <span className="font-medium">PayPal</span>
              </div>
              <div className="flex items-center gap-3 bg-card border border-border px-6 py-4 rounded-lg">
                <CreditCard className="w-6 h-6 text-primary" />
                <span className="font-medium">Klarna</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Payment method availability varies by region</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-wrap justify-center gap-6 mb-16"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm">PCI DSS Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm">GDPR/DSG Compliant</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-3xl mx-auto bg-muted/50 border border-border p-8 rounded-lg"
          >
            <h2 className="font-display text-2xl tracking-wider mb-6 text-center">{t('pricing.howItWorks.title')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-display text-lg">1</div>
                <h3 className="font-medium mb-2">{t('pricing.howItWorks.step1.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('pricing.howItWorks.step1.description')}</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-display text-lg">2</div>
                <h3 className="font-medium mb-2">{t('pricing.howItWorks.step2.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('pricing.howItWorks.step2.description')}</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-display text-lg">3</div>
                <h3 className="font-medium mb-2">{t('pricing.howItWorks.step3.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('pricing.howItWorks.step3.description')}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
</div>
  );
}
