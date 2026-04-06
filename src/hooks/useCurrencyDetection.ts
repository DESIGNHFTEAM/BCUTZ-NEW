import { useEffect, useState } from 'react';
import { getCurrencyForRegion, isCurrencySupported } from '@/lib/feeCalculator';

/**
 * Detect user's preferred currency based on browser locale and timezone
 */
export const detectUserCurrency = (): string => {
  // Try to get currency from browser's locale
  try {
    const locale = navigator.language || navigator.languages?.[0];
    
    if (locale) {
      // Extract region from locale (e.g., 'en-US' -> 'US', 'de-CH' -> 'CH')
      const parts = locale.split('-');
      if (parts.length >= 2) {
        const region = parts[parts.length - 1].toUpperCase();
        const currency = getCurrencyForRegion(region);
        if (isCurrencySupported(currency)) {
          return currency;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to detect locale:', e);
  }

  // Try timezone-based detection as fallback
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneRegionMap: Record<string, string> = {
      'Europe/Zurich': 'CH',
      'Europe/Berlin': 'DE',
      'Europe/Vienna': 'AT',
      'Europe/Paris': 'FR',
      'Europe/Rome': 'IT',
      'Europe/London': 'GB',
      'Europe/Warsaw': 'PL',
      'Europe/Prague': 'CZ',
      'Europe/Stockholm': 'SE',
      'Europe/Copenhagen': 'DK',
      'Europe/Oslo': 'NO',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Toronto': 'CA',
    };

    const region = timezoneRegionMap[timezone];
    if (region) {
      const currency = getCurrencyForRegion(region);
      if (isCurrencySupported(currency)) {
        return currency;
      }
    }
  } catch (e) {
    console.warn('Failed to detect timezone:', e);
  }

  // Default to CHF for Swiss-based platform
  return 'CHF';
};

/**
 * Hook to detect and manage user's preferred currency
 */
export const useCurrencyDetection = () => {
  const [detectedCurrency, setDetectedCurrency] = useState<string>('CHF');
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const currency = detectUserCurrency();
    setDetectedCurrency(currency);
    setIsDetecting(false);
  }, []);

  return {
    detectedCurrency,
    isDetecting,
  };
};

/**
 * Get currency symbol for display
 */
export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    CHF: 'CHF',
    EUR: '€',
    USD: '$',
    GBP: '£',
    PLN: 'zł',
    CZK: 'Kč',
    SEK: 'kr',
    DKK: 'kr',
    NOK: 'kr',
  };
  return symbols[currency.toUpperCase()] || currency;
};

/**
 * Get currency display name
 */
export const getCurrencyName = (currency: string): string => {
  const names: Record<string, string> = {
    CHF: 'Swiss Franc',
    EUR: 'Euro',
    USD: 'US Dollar',
    GBP: 'British Pound',
    PLN: 'Polish Złoty',
    CZK: 'Czech Koruna',
    SEK: 'Swedish Krona',
    DKK: 'Danish Krone',
    NOK: 'Norwegian Krone',
  };
  return names[currency.toUpperCase()] || currency;
};
