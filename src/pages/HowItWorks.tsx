import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import cutzLogo from '@/assets/cutz-logo.svg';
import { getPathWithLanguage, LanguageCode } from '@/lib/i18n';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { HowToSchema } from '@/components/seo/HowToSchema';

export default function HowItWorks() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as LanguageCode;
  const getLocalizedPath = (path: string) => getPathWithLanguage(path, currentLang);

  // HowTo steps for schema markup
  const howToSteps = [
    {
      name: 'Find Your Barber',
      text: 'Browse our curated selection of verified professional barbers. Filter by location, services, ratings, and availability to find your perfect match.',
    },
    {
      name: 'Book an Appointment',
      text: 'Select your preferred service, choose a convenient date and time slot, and confirm your booking with secure online payment.',
    },
    {
      name: 'Get Your Haircut',
      text: 'Visit the barbershop at your scheduled time. Show your booking confirmation and enjoy a professional grooming experience.',
    },
    {
      name: 'Leave a Review',
      text: 'After your appointment, share your experience by leaving a rating and review to help other customers find great barbers.',
    },
  ];

  // FAQ content for schema markup
  const faqs = [
    {
      question: 'How do I book an appointment with BCUTZ?',
      answer: 'Simply browse our verified barbers, select your preferred professional, choose a service and time slot, then complete your booking with secure online payment.',
    },
    {
      question: 'Is BCUTZ free to use for customers?',
      answer: 'Yes, browsing and discovering barbers is completely free. You only pay a small booking fee (approximately CHF 1.50) when you make a reservation.',
    },
    {
      question: 'How do I become a barber on BCUTZ?',
      answer: 'Click "Become a Professional" to create your profile. Add your services, set your availability, and start receiving bookings. There are no monthly fees - you only pay when you earn.',
    },
    {
      question: 'What payment methods does BCUTZ accept?',
      answer: 'We accept credit/debit cards, TWINT, PayPal, and Klarna. All payments are processed securely through Stripe.',
    },
    {
      question: 'Can I reschedule or cancel my booking?',
      answer: 'Yes, you can manage your bookings through your account. Cancellation policies vary by barber, so check the terms before booking.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <FAQSchema faqs={faqs} />
      <HowToSchema
        name="How to Book a Barber Appointment with BCUTZ"
        description="A simple 4-step guide to finding and booking your perfect barber on BCUTZ, Switzerland's premier barber booking platform."
        steps={howToSteps}
        totalTime="PT5M"
      />
{/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-dark">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-5xl md:text-6xl font-bold mb-6 flex items-center justify-center gap-3 flex-wrap group cursor-default"
            >
              {t('howItWorksPage.hero.titlePart1')}{' '}
              <img 
                src={cutzLogo} 
                alt="BCUTZ" 
                className="h-12 md:h-16 inline-block drop-shadow-[0_0_10px_hsl(var(--gold)/0.5)] transition-all duration-300 group-hover:drop-shadow-[0_0_25px_hsl(var(--gold)/0.9)] group-hover:scale-110" 
              />
              {' '}{t('howItWorksPage.hero.titlePart2')}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-foreground/80 text-xl max-w-2xl mx-auto"
            >
              {t('howItWorksPage.hero.subtitle')}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main How It Works Content */}
      <HowItWorksSection />

      {/* CTA Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
              <h2 className="font-display text-4xl font-bold mb-6 text-foreground">
              {t('howItWorksPage.cta.title')}
            </h2>
              <p className="text-foreground/80 text-lg mb-8">
              {t('howItWorksPage.cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                <Link to={getLocalizedPath('/barbers')}>
                  {t('howItWorksPage.cta.findBarbers')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={getLocalizedPath('/for-professionals')}>
                  {t('howItWorksPage.cta.forProfessionals')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
</div>
  );
}
