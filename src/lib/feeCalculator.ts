/**
 * BCUTZ Multi-Currency Fee Calculator
 * 
 * This module ensures BCUTZ always nets at least CHF 2.00 (or equivalent in local currency)
 * after Stripe processing fees, regardless of payment method or customer location.
 * 
 * Strategy:
 * - Use worst-case fee scenario (PayPal/Klarna: 3.49% + fixed fee)
 * - Add international card surcharge buffer (1.5% for cross-border)
 * - Apply currency-specific fixed fees based on Stripe's pricing
 * - Round up to local currency conventions
 */

// Supported currencies with their fee structures
// Based on Stripe's pricing for Switzerland (merchant location)
export interface CurrencyConfig {
  code: string;
  symbol: string;
  fixedFee: number; // Fixed transaction fee in local currency
  roundingUnit: number; // Smallest unit for rounding (e.g., 0.05 for Swiss 5 centimes)
  minPlatformFee: number; // Minimum platform fee equivalent to CHF 2.00
}

// Exchange rates to CHF (approximate, used for minimum fee calculation)
// In production, these would be fetched from Stripe's FX API
const CHF_EXCHANGE_RATES: Record<string, number> = {
  CHF: 1.00,
  EUR: 1.05,  // 1 CHF ≈ 0.95 EUR
  USD: 1.15,  // 1 CHF ≈ 0.87 USD
  GBP: 1.25,  // 1 CHF ≈ 0.80 GBP
  PLN: 0.22,  // 1 CHF ≈ 4.5 PLN
  CZK: 0.038, // 1 CHF ≈ 26 CZK
  SEK: 0.085, // 1 CHF ≈ 11.8 SEK
  DKK: 0.14,  // 1 CHF ≈ 7.2 DKK
  NOK: 0.082, // 1 CHF ≈ 12.2 NOK
};

// Stripe fixed fees by currency (worst-case scenario)
// Source: Stripe pricing pages for European merchants
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    fixedFee: 0.35, // PayPal worst case
    roundingUnit: 0.05, // Swiss 5 centimes
    minPlatformFee: 2.00,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    fixedFee: 0.30,
    roundingUnit: 0.01,
    minPlatformFee: 1.90, // ~2 CHF equivalent
  },
  USD: {
    code: 'USD',
    symbol: '$',
    fixedFee: 0.35,
    roundingUnit: 0.01,
    minPlatformFee: 1.75, // ~2 CHF equivalent
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    fixedFee: 0.25,
    roundingUnit: 0.01,
    minPlatformFee: 1.60, // ~2 CHF equivalent
  },
  PLN: {
    code: 'PLN',
    symbol: 'zł',
    fixedFee: 1.50,
    roundingUnit: 0.01,
    minPlatformFee: 9.00, // ~2 CHF equivalent
  },
  CZK: {
    code: 'CZK',
    symbol: 'Kč',
    fixedFee: 8.00,
    roundingUnit: 1.00,
    minPlatformFee: 52.00, // ~2 CHF equivalent
  },
  SEK: {
    code: 'SEK',
    symbol: 'kr',
    fixedFee: 3.50,
    roundingUnit: 0.01,
    minPlatformFee: 24.00, // ~2 CHF equivalent
  },
  DKK: {
    code: 'DKK',
    symbol: 'kr',
    fixedFee: 2.50,
    roundingUnit: 0.01,
    minPlatformFee: 14.40, // ~2 CHF equivalent
  },
  NOK: {
    code: 'NOK',
    symbol: 'kr',
    fixedFee: 3.50,
    roundingUnit: 0.01,
    minPlatformFee: 25.00, // ~2 CHF equivalent
  },
};

// Fee rate constants
const FEE_RATES = {
  // Worst-case percentage (PayPal/Klarna)
  BASE_PERCENTAGE: 0.0349, // 3.49%
  // International card surcharge
  INTERNATIONAL_SURCHARGE: 0.015, // 1.5%
  // Currency conversion fee (if applicable)
  FX_FEE: 0.02, // 2%
};

/**
 * Calculate the total effective fee rate based on transaction type
 */
export const getEffectiveFeeRate = (isInternational: boolean = true): number => {
  let rate = FEE_RATES.BASE_PERCENTAGE;
  
  // Add international surcharge for cross-border payments
  if (isInternational) {
    rate += FEE_RATES.INTERNATIONAL_SURCHARGE;
  }
  
  return rate;
};

/**
 * Calculate the booking fee that ensures BCUTZ nets at least the minimum platform fee
 * after Stripe takes their processing fees.
 * 
 * Formula: bookingFee = (targetNet + fixedFee + servicePrice * feeRate) / (1 - feeRate)
 * 
 * This reverses the Stripe fee calculation to determine what we need to charge
 * so that after Stripe takes their cut, we have exactly our target net amount.
 */
export const calculateBookingFee = (
  servicePrice: number,
  currency: string = 'CHF',
  isInternational: boolean = true
): number => {
  const config = CURRENCY_CONFIGS[currency.toUpperCase()] || CURRENCY_CONFIGS.CHF;
  const feeRate = getEffectiveFeeRate(isInternational);
  
  // Calculate the booking fee needed to net the minimum platform fee
  const bookingFee = (config.minPlatformFee + config.fixedFee + servicePrice * feeRate) / (1 - feeRate);
  
  // Round up to the currency's rounding unit
  const rounded = Math.ceil(bookingFee / config.roundingUnit) * config.roundingUnit;
  
  return rounded;
};

/**
 * Calculate total customer payment including service price and booking fee
 */
export const calculateTotalPayment = (
  servicePrice: number,
  currency: string = 'CHF',
  isInternational: boolean = true
): { servicePrice: number; bookingFee: number; total: number; currency: string } => {
  const bookingFee = calculateBookingFee(servicePrice, currency, isInternational);
  
  return {
    servicePrice,
    bookingFee,
    total: servicePrice + bookingFee,
    currency: currency.toUpperCase(),
  };
};

/**
 * Format price for display with currency symbol
 */
export const formatPrice = (amount: number, currency: string = 'CHF'): string => {
  const config = CURRENCY_CONFIGS[currency.toUpperCase()] || CURRENCY_CONFIGS.CHF;
  
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get default currency based on region/country code
 */
export const getCurrencyForRegion = (region?: string): string => {
  if (!region) return 'CHF';
  
  const regionToCurrency: Record<string, string> = {
    CH: 'CHF',
    LI: 'CHF',
    DE: 'EUR',
    AT: 'EUR',
    FR: 'EUR',
    IT: 'EUR',
    ES: 'EUR',
    NL: 'EUR',
    BE: 'EUR',
    LU: 'EUR',
    IE: 'EUR',
    PT: 'EUR',
    FI: 'EUR',
    GR: 'EUR',
    SK: 'EUR',
    SI: 'EUR',
    EE: 'EUR',
    LV: 'EUR',
    LT: 'EUR',
    MT: 'EUR',
    CY: 'EUR',
    GB: 'GBP',
    US: 'USD',
    CA: 'USD',
    PL: 'PLN',
    CZ: 'CZK',
    SE: 'SEK',
    DK: 'DKK',
    NO: 'NOK',
  };
  
  return regionToCurrency[region.toUpperCase()] || 'CHF';
};

/**
 * Validate if a currency is supported
 */
export const isCurrencySupported = (currency: string): boolean => {
  return currency.toUpperCase() in CURRENCY_CONFIGS;
};

/**
 * Get all supported currencies for display
 */
export const getSupportedCurrencies = (): CurrencyConfig[] => {
  return Object.values(CURRENCY_CONFIGS);
};
