import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '@/locales/en.json';
import de from '@/locales/de.json';
import fr from '@/locales/fr.json';
import it from '@/locales/it.json';

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch (CH)', flag: '🇨🇭' },
  { code: 'fr', name: 'Français (CH)', flag: '🇨🇭' },
  { code: 'it', name: 'Italiano (CH)', flag: '🇨🇭' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

// Get language from URL path
function getLanguageFromPathInternal(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const match = path.match(/^\/(de|fr|it)(\/|$)/);
  return match ? match[1] : null;
}

// Get language from localStorage
function getStoredLanguage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('i18nextLng');
}

// Get browser preferred language
function getBrowserLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (!browserLang) return 'en';
  
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  const supportedMap: Record<string, LanguageCode> = {
    'de': 'de',
    'fr': 'fr',
    'en': 'en',
    'it': 'it',
    'gsw': 'de', // Swiss German dialects
  };
  
  return supportedMap[langCode] || 'en';
}

// Determine the initial language synchronously before i18n initializes
function determineInitialLanguage(): LanguageCode {
  // Priority 1: URL path
  const pathLang = getLanguageFromPathInternal();
  if (pathLang) return pathLang as LanguageCode;
  
  // Priority 2: localStorage (user preference)
  const storedLang = getStoredLanguage();
  if (storedLang && ['en', 'de', 'fr', 'it'].includes(storedLang)) {
    return storedLang as LanguageCode;
  }
  
  // Priority 3: Browser language (for first-time visitors)
  return getBrowserLanguage();
}

const initialLanguage = determineInitialLanguage();

// Initialize i18n with the determined language
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
    },
    lng: initialLanguage, // Set the initial language explicitly
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr', 'it'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // Disable suspense to prevent loading flash on mobile
    },
  });

// Store the initial language preference
if (typeof window !== 'undefined' && !getStoredLanguage()) {
  localStorage.setItem('i18nextLng', initialLanguage);
}

export default i18n;

export function getLanguageFromPath(pathname: string): LanguageCode {
  const match = pathname.match(/^\/(de|fr|it)(\/|$)/);
  return (match ? match[1] : 'en') as LanguageCode;
}

export function getPathWithoutLanguage(pathname: string): string {
  return pathname.replace(/^\/(de|fr|it)(\/|$)/, '/');
}

export function getPathWithLanguage(pathname: string, lang: LanguageCode): string {
  const cleanPath = getPathWithoutLanguage(pathname);
  if (lang === 'en') {
    return cleanPath;
  }
  return `/${lang}${cleanPath === '/' ? '' : cleanPath}`;
}

// Utility to detect if user's browser prefers a specific language
export function getBrowserPreferredLanguage(): LanguageCode {
  return getBrowserLanguage();
}
