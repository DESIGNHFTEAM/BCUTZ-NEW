import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'bcutz_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'bcutz_cookie_preferences';

export function CookieConsent() {
  const { t, i18n } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const hasConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsent) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    savePreferences(onlyNecessary);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setIsVisible(false);
    setShowSettings(false);
  };

  const getLangPath = () => {
    const lang = i18n.language;
    return lang === 'en' ? '' : `/${lang}`;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      >
        <div className="container mx-auto max-w-4xl">
          <div className="bg-card border-2 border-border shadow-2xl">
            {/* Main Banner */}
            {!showSettings ? (
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="hidden md:flex w-12 h-12 bg-accent/20 items-center justify-center shrink-0">
                    <Cookie className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg tracking-wider mb-2">
                      {t('cookieConsent.title', 'COOKIE SETTINGS')}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {t('cookieConsent.description', 'We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.')}
                      {' '}
                      <Link 
                        to={`${getLangPath()}/cookies`} 
                        className="text-accent underline hover:no-underline"
                      >
                        {t('cookieConsent.learnMore', 'Learn more')}
                      </Link>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={handleAcceptAll} className="gap-2">
                        <Check className="w-4 h-4" />
                        {t('cookieConsent.acceptAll', 'Accept All')}
                      </Button>
                      <Button variant="outline" onClick={handleRejectAll} className="text-foreground">
                        {t('cookieConsent.rejectAll', 'Reject All')}
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setShowSettings(true)}
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        {t('cookieConsent.customize', 'Customize')}
                      </Button>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsVisible(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Settings Panel */
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg tracking-wider">
                    {t('cookieConsent.settingsTitle', 'COOKIE PREFERENCES')}
                  </h3>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Necessary Cookies */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 border border-border">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {t('cookieConsent.necessary', 'Necessary Cookies')}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('cookieConsent.necessaryDesc', 'Required for the website to function. Cannot be disabled.')}
                      </p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 border border-border">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {t('cookieConsent.analytics', 'Analytics Cookies')}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('cookieConsent.analyticsDesc', 'Help us understand how visitors interact with our website.')}
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.analytics}
                      onCheckedChange={(checked) => setPreferences(p => ({ ...p, analytics: checked }))}
                    />
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 border border-border">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {t('cookieConsent.marketing', 'Marketing Cookies')}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('cookieConsent.marketingDesc', 'Used to deliver personalized advertisements.')}
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.marketing}
                      onCheckedChange={(checked) => setPreferences(p => ({ ...p, marketing: checked }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSavePreferences} className="gap-2">
                    <Check className="w-4 h-4" />
                    {t('cookieConsent.savePreferences', 'Save Preferences')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowSettings(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
