import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ContactPageSchema } from '@/components/seo/ContactPageSchema';
import { 
  MapPin, Phone, Mail, Clock, 
  MessageSquare, Send, Loader2 
} from 'lucide-react';

export default function Contact() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: t('contact.successTitle'),
      description: t('contact.successMessage'),
    });
    
    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <ContactPageSchema
        name="BCUTZ"
        url="https://bcutz.lovable.app/contact"
        description="Contact BCUTZ for inquiries about barber bookings, professional partnerships, or support. We're here to help."
        address={{
          streetAddress: 'Bahnhofstrasse 1',
          addressLocality: 'Zurich',
          postalCode: '8001',
          addressCountry: 'CH',
        }}
        telephone="+41 44 123 45 67"
        email="team@bcutz.com"
        openingHours="Mo-Fr 09:00-18:00"
      />
<main className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <p className="text-xs tracking-[0.3em] text-primary mb-4">{t('contact.tagline')}</p>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-wider mb-6">
              {t('contact.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('contact.subtitle')}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <div className="p-6 border border-border bg-card">
                <MapPin className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-display font-bold mb-1">{t('contact.address')}</h3>
                <p className="text-sm text-muted-foreground">
                  Bahnhofstrasse 1<br />
                  8001 Zurich<br />
                  Switzerland
                </p>
              </div>

              <div className="p-6 border border-border bg-card">
                <Mail className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-display font-bold mb-1">{t('contact.email')}</h3>
                <p className="text-sm text-muted-foreground">
                  team@bcutz.com<br />
                  support@bcutz.com
                </p>
              </div>

              <div className="p-6 border border-border bg-card">
                <Phone className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-display font-bold mb-1">{t('contact.phone')}</h3>
                <p className="text-sm text-muted-foreground">
                  +41 44 123 45 67
                </p>
              </div>

              <div className="p-6 border border-border bg-card">
                <Clock className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-display font-bold mb-1">{t('contact.hours')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('contact.hoursValue')}
                </p>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="p-8 border border-border bg-card">
                <div className="flex items-center gap-3 mb-6">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <h2 className="font-display text-2xl font-bold">{t('contact.formTitle')}</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('contact.nameLabel')}</label>
                      <Input
                        placeholder={t('contact.namePlaceholder')}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('contact.emailLabel')}</label>
                      <Input
                        type="email"
                        placeholder={t('contact.emailPlaceholder')}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('contact.subjectLabel')}</label>
                    <Input
                      placeholder={t('contact.subjectPlaceholder')}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('contact.messageLabel')}</label>
                    <Textarea
                      placeholder={t('contact.messagePlaceholder')}
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('contact.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {t('contact.send')}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
</div>
  );
}
