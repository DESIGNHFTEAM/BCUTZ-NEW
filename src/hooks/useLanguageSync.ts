import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that syncs the user's language preference with their profile.
 * - On login: Loads the user's preferred language from their profile
 * - On language change: Saves the new language to their profile
 */
export function useLanguageSync() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Load user's preferred language on login
  useEffect(() => {
    if (!user) return;

    const loadUserLanguage = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .single();

      if (!error && data?.preferred_language) {
        // Only change if different from current
        if (data.preferred_language !== i18n.language) {
          i18n.changeLanguage(data.preferred_language);
          localStorage.setItem('i18nextLng', data.preferred_language);
        }
      }
    };

    loadUserLanguage();
  }, [user?.id]);

  // Save language preference when it changes
  useEffect(() => {
    if (!user) return;

    const saveLanguagePreference = async () => {
      // Small delay to avoid race conditions
      await supabase
        .from('profiles')
        .update({ preferred_language: i18n.language })
        .eq('id', user.id);
    };

    // Only save if user is logged in
    const handleLanguageChange = () => {
      saveLanguagePreference();
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [user?.id, i18n]);
}
