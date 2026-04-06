import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, MapPin, Check, Wallet } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/animations/PageTransition';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getSupportedCurrencies } from '@/lib/feeCalculator';
import { useCurrencyDetection, getCurrencyName } from '@/hooks/useCurrencyDetection';
import { useTranslation } from 'react-i18next';
import { getPathWithLanguage, getLanguageFromPath, type LanguageCode } from '@/lib/i18n';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

const regions = [
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
];

const currencies = getSupportedCurrencies();

const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function LanguageRegion() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { detectedCurrency } = useCurrencyDetection();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Helper to get localized path
  const currentLang = getLanguageFromPath(location.pathname);
  const localizedPath = (path: string) => getPathWithLanguage(path, currentLang);
  
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language?.substring(0, 2) || 'en');
  const [selectedRegion, setSelectedRegion] = useState('CH');
  const [selectedCurrency, setSelectedCurrency] = useState('CHF');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_language, region, preferred_currency')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data) {
      // Use the current i18n language (from URL/active state), not the stale DB value
      setSelectedLanguage(i18n.language?.substring(0, 2) || data.preferred_language || 'en');
      setSelectedRegion(data.region || 'CH');
      // Use saved currency, or detected currency, or default to CHF
      setSelectedCurrency(data.preferred_currency || detectedCurrency || 'CHF');
    } else {
      // New user - use detected currency
      setSelectedCurrency(detectedCurrency);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        preferred_language: selectedLanguage,
        region: selectedRegion,
        preferred_currency: selectedCurrency,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: t('common.error', 'Error'),
        description: t('settings.saveError'),
        variant: 'destructive',
      });
    } else {
      // Apply language change immediately
      i18n.changeLanguage(selectedLanguage);
      localStorage.setItem('i18nextLng', selectedLanguage);
      
      toast({
        title: t('common.success', 'Success'),
        description: t('settings.languageUpdated'),
      });
      
      // Navigate to the correct language path
      const newPath = getPathWithLanguage('/settings/language-region', selectedLanguage as LanguageCode);
      navigate(newPath, { replace: true });
    }
    setIsSaving(false);
  };

  // Handle immediate language switch for quick selection
  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
  };

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
              {t('settings.languageRegion.title', 'LANGUAGE & REGION').toUpperCase()}
            </motion.h1>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Language Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-border p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Globe className="w-5 h-5" />
                    <h2 className="font-display text-xl tracking-wider">{t('settings.languageRegion.language')}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`border-2 p-4 flex items-center justify-between transition-colors ${
                          selectedLanguage === lang.code 
                            ? 'border-foreground bg-foreground text-background' 
                            : 'border-border hover:border-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{lang.flag}</span>
                          <span className="font-display tracking-wider">{lang.name.toUpperCase()}</span>
                        </div>
                        {selectedLanguage === lang.code && (
                          <Check className="w-5 h-5" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Region Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="border-2 border-border p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-5 h-5" />
                    <h2 className="font-display text-xl tracking-wider">{t('settings.languageRegion.region')}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {regions.map((region) => (
                      <button
                        key={region.code}
                        onClick={() => setSelectedRegion(region.code)}
                        className={`border-2 p-3 flex items-center justify-between transition-colors ${
                          selectedRegion === region.code 
                            ? 'border-foreground bg-foreground text-background' 
                            : 'border-border hover:border-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{region.flag}</span>
                          <span className="font-display text-xs tracking-wider">{region.name.toUpperCase()}</span>
                        </div>
                        {selectedRegion === region.code && (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Currency Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="border-2 border-border p-8"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Wallet className="w-5 h-5" />
                    <h2 className="font-display text-xl tracking-wider">{t('settings.languageRegion.paymentCurrency')}</h2>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">
                    {t('settings.languageRegion.paymentCurrencyDesc')}
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {currencies.map((currency) => (
                      <button
                        key={currency.code}
                        onClick={() => setSelectedCurrency(currency.code)}
                        className={`border-2 p-4 flex flex-col items-center justify-center transition-colors ${
                          selectedCurrency === currency.code 
                            ? 'border-foreground bg-foreground text-background' 
                            : 'border-border hover:border-foreground'
                        }`}
                      >
                        <span className="font-display text-2xl">{currency.symbol}</span>
                        <span className="text-xs tracking-wider mt-1">{currency.code}</span>
                        {selectedCurrency === currency.code && (
                          <Check className="w-4 h-4 mt-2" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {detectedCurrency && detectedCurrency !== selectedCurrency && (
                    <p className="text-xs text-muted-foreground mt-4">
                      {t('settings.languageRegion.detectedCurrency')}: <strong>{getCurrencyName(detectedCurrency)}</strong>
                    </p>
                  )}
                </motion.div>

                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? t('settings.saving') : t('settings.savePreferences')}
                </Button>
              </div>
            )}
          </div>
        </main>
</div>
    </PageTransition>
  );
}