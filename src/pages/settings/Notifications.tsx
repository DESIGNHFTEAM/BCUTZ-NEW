import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Mail, Smartphone } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/animations/PageTransition';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPathWithLanguage, getLanguageFromPath } from '@/lib/i18n';

interface NotificationSettings {
  email_bookings: boolean;
  email_reminders: boolean;
  email_promotions: boolean;
  email_reviews: boolean;
  push_bookings: boolean;
  push_reminders: boolean;
  push_promotions: boolean;
}

const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const location = useLocation();
  
  // Helper to get localized path
  const currentLang = getLanguageFromPath(location.pathname);
  const localizedPath = (path: string) => getPathWithLanguage(path, currentLang);
  
  const [settings, setSettings] = useState<NotificationSettings>({
    email_bookings: true,
    email_reminders: true,
    email_promotions: false,
    email_reviews: true,
    push_bookings: true,
    push_reminders: true,
    push_promotions: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings({
        email_bookings: data.email_bookings,
        email_reminders: data.email_reminders,
        email_promotions: data.email_promotions,
        email_reviews: data.email_reviews,
        push_bookings: data.push_bookings,
        push_reminders: data.push_reminders,
        push_promotions: data.push_promotions,
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    // Check if settings exist
    const { data: existing } = await supabase
      .from('notification_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('notification_settings')
        .update(settings)
        .eq('user_id', user.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('notification_settings')
        .insert({ user_id: user.id, ...settings });
      error = result.error;
    }

    if (error) {
      toast({
        title: t('settings.notificationsPage.error'),
        description: t('settings.notificationsPage.errorDesc'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('settings.notificationsPage.success'),
        description: t('settings.notificationsPage.successDesc'),
      });
    }
    setIsSaving(false);
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  const emailSettings = [
    { key: 'email_bookings' as const, label: t('settings.notificationsPage.bookingConfirmations'), description: t('settings.notificationsPage.bookingConfirmationsDesc') },
    { key: 'email_reminders' as const, label: t('settings.notificationsPage.appointmentReminders'), description: t('settings.notificationsPage.appointmentRemindersDesc') },
    { key: 'email_reviews' as const, label: t('settings.notificationsPage.reviewRequests'), description: t('settings.notificationsPage.reviewRequestsDesc') },
    { key: 'email_promotions' as const, label: t('settings.notificationsPage.promotionsOffers'), description: t('settings.notificationsPage.promotionsOffersDesc') },
  ];

  const pushSettings = [
    { key: 'push_bookings' as const, label: t('settings.notificationsPage.bookingUpdates'), description: t('settings.notificationsPage.bookingUpdatesDesc') },
    { key: 'push_reminders' as const, label: t('settings.notificationsPage.phoneReminders'), description: t('settings.notificationsPage.phoneRemindersDesc') },
    { key: 'push_promotions' as const, label: t('settings.notificationsPage.promotions'), description: t('settings.notificationsPage.promotionsDesc') },
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
              className="font-display text-4xl md:text-5xl tracking-wider mb-12"
            >
              {t('settings.notificationsPage.title')}
            </motion.h1>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Email Notifications */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-border p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Mail className="w-5 h-5" />
                    <h2 className="font-display text-xl tracking-wider">{t('settings.notificationsPage.emailNotifications')}</h2>
                  </div>

                  <div className="space-y-6">
                    {emailSettings.map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium tracking-wider">{setting.label}</p>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                        <Switch
                          checked={settings[setting.key]}
                          onCheckedChange={(checked) => updateSetting(setting.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Push Notifications */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="border-2 border-border p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Smartphone className="w-5 h-5" />
                    <h2 className="font-display text-xl tracking-wider">{t('settings.notificationsPage.pushNotifications')}</h2>
                  </div>

                  <div className="space-y-6">
                    {pushSettings.map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium tracking-wider">{setting.label}</p>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                        <Switch
                          checked={settings[setting.key]}
                          onCheckedChange={(checked) => updateSetting(setting.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>

                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? t('settings.notificationsPage.saving') : t('settings.notificationsPage.savePreferences')}
                </Button>
              </div>
            )}
          </div>
        </main>
</div>
    </PageTransition>
  );
}
