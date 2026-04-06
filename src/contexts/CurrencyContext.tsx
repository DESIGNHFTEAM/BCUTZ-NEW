import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { detectUserCurrency, getCurrencyName, getCurrencySymbol } from '@/hooks/useCurrencyDetection';
import { getSupportedCurrencies, formatPrice as formatPriceUtil } from '@/lib/feeCalculator';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatPrice: (amount: number, originalCurrency?: string) => string;
  getCurrencySymbol: (currency?: string) => string;
  isLoading: boolean;
  supportedCurrencies: { code: string; symbol: string; name: string }[];
  isConverted: (originalCurrency?: string) => boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Approximate exchange rates to CHF (for display purposes only)
// Actual conversion happens at Stripe checkout
const EXCHANGE_RATES_TO_CHF: Record<string, number> = {
  CHF: 1.00,
  EUR: 1.05,
  USD: 0.87,
  GBP: 1.25,
  PLN: 0.22,
  CZK: 0.038,
  SEK: 0.085,
  DKK: 0.14,
  NOK: 0.082,
};

// Convert from one currency to another (approximate)
const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to CHF first, then to target
  const fromRate = EXCHANGE_RATES_TO_CHF[fromCurrency.toUpperCase()] || 1;
  const toRate = EXCHANGE_RATES_TO_CHF[toCurrency.toUpperCase()] || 1;
  
  const amountInCHF = amount * fromRate;
  const converted = amountInCHF / toRate;
  
  // Round to 2 decimal places
  return Math.round(converted * 100) / 100;
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<string>('CHF');
  const [isLoading, setIsLoading] = useState(true);

  // Load user's preferred currency
  useEffect(() => {
    const loadCurrency = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_currency')
          .eq('id', user.id)
          .maybeSingle();

        if (data?.preferred_currency) {
          setCurrencyState(data.preferred_currency);
        } else {
          // Fallback to detected currency
          setCurrencyState(detectUserCurrency());
        }
      } else {
        // Not logged in - use detected currency
        setCurrencyState(detectUserCurrency());
      }
      setIsLoading(false);
    };

    loadCurrency();
  }, [user]);

  // Save currency preference when changed
  const setCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: newCurrency })
        .eq('id', user.id);
    }
  };

  // Format price in user's preferred currency
  const formatPrice = (amount: number, originalCurrency?: string): string => {
    const from = originalCurrency?.toUpperCase() || 'CHF';
    const to = currency.toUpperCase();
    
    // If same currency, just format
    if (from === to) {
      return formatPriceUtil(amount, currency);
    }
    
    // Convert and format
    const converted = convertCurrency(amount, from, to);
    return formatPriceUtil(converted, currency);
  };

  const getCurrencySymbolLocal = (curr?: string): string => {
    return getCurrencySymbol(curr || currency);
  };

  const supportedCurrencies = getSupportedCurrencies().map(c => ({
    code: c.code,
    symbol: c.symbol,
    name: getCurrencyName(c.code),
  }));

  // Check if currency conversion is being applied
  const isConverted = (originalCurrency?: string): boolean => {
    const from = originalCurrency?.toUpperCase() || 'CHF';
    return from !== currency.toUpperCase();
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      formatPrice,
      getCurrencySymbol: getCurrencySymbolLocal,
      isLoading,
      supportedCurrencies,
      isConverted,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

/**
 * Hook for components that need to display prices but don't need full context
 */
export function useFormatPrice() {
  const { formatPrice, currency, getCurrencySymbol, isConverted } = useCurrency();
  return { formatPrice, currency, getCurrencySymbol, isConverted };
}
