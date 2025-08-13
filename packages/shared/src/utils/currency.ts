/**
 * Currency conversion and formatting utilities
 * Provides comprehensive currency handling with regional formatting
 */

import { CURRENCY_CONFIG } from '../constants';
import type { Currency, Locale } from '../types/common';

/**
 * Exchange rate service for currency conversion
 */
export class CurrencyService {
  private exchangeRates: Record<string, number> = {};
  private lastUpdateTime: number = 0;
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Set exchange rates (normally fetched from external API)
   */
  setExchangeRates(rates: Record<string, number>): void {
    this.exchangeRates = rates;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Get current exchange rates
   */
  getExchangeRates(): Record<string, number> {
    return { ...this.exchangeRates };
  }

  /**
   * Check if exchange rates need updating
   */
  needsUpdate(): boolean {
    return Date.now() - this.lastUpdateTime > this.CACHE_DURATION_MS;
  }

  /**
   * Convert amount between currencies
   */
  convert(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = this.exchangeRates[rateKey];

    if (rate) {
      return amount * rate;
    }

    // Try inverse rate
    const inverseKey = `${toCurrency}_${fromCurrency}`;
    const inverseRate = this.exchangeRates[inverseKey];
    
    if (inverseRate) {
      return amount / inverseRate;
    }

    throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
  }

  /**
   * Get currency symbol and configuration
   */
  getCurrencyConfig(currency: Currency) {
    return CURRENCY_CONFIG[currency];
  }
}

/**
 * Default currency service instance
 */
export const currencyService = new CurrencyService();

/**
 * Set default exchange rates (static rates for MVP)
 * In production, these would be fetched from a real-time API
 */
currencyService.setExchangeRates({
  // USD base rates
  USD_EUR: 0.85,
  USD_SAR: 3.75,
  USD_AED: 3.67,
  
  // EUR base rates
  EUR_USD: 1.18,
  EUR_SAR: 4.41,
  EUR_AED: 4.32,
  
  // SAR base rates
  SAR_USD: 0.27,
  SAR_EUR: 0.23,
  SAR_AED: 0.98,
  
  // AED base rates
  AED_USD: 0.27,
  AED_EUR: 0.23,
  AED_SAR: 1.02,
});

/**
 * Format currency amount with proper localization
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  locale?: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const config = CURRENCY_CONFIG[currency];
  const formatLocale = locale === 'ar' 
    ? config.locale.includes('ar') ? config.locale : 'ar-SA'
    : config.locale;

  const formatter = new Intl.NumberFormat(formatLocale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
    ...options,
  });

  return formatter.format(amount);
}

/**
 * Format currency amount without currency symbol
 */
export function formatAmount(
  amount: number,
  currency: Currency,
  locale?: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const config = CURRENCY_CONFIG[currency];
  const formatLocale = locale === 'ar' 
    ? config.locale.includes('ar') ? config.locale : 'ar-SA'
    : config.locale;

  const formatter = new Intl.NumberFormat(formatLocale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
    ...options,
  });

  return formatter.format(amount);
}

/**
 * Get currency symbol for a given currency
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_CONFIG[currency].symbol;
}

/**
 * Parse currency amount from formatted string
 */
export function parseCurrency(
  formattedAmount: string,
  currency: Currency,
  locale?: Locale
): number {
  const config = CURRENCY_CONFIG[currency];
  
  // Remove currency symbols and non-numeric characters (except decimal separators)
  let cleanAmount = formattedAmount
    .replace(new RegExp(config.symbol, 'g'), '')
    .replace(/[^\d.,\-]/g, '');

  // Handle different decimal separators based on locale
  if (locale === 'ar' || config.locale.includes('ar')) {
    // Arabic locales typically use comma as thousands separator, dot as decimal
    cleanAmount = cleanAmount.replace(/,(?=\d{3})/g, '').replace(',', '.');
  } else {
    // Handle European format (dot for thousands, comma for decimal)
    if (config.locale.includes('de') || config.locale.includes('fr')) {
      const parts = cleanAmount.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Comma is decimal separator
        cleanAmount = cleanAmount.replace(/\.(?=\d{3})/g, '').replace(',', '.');
      } else {
        // Comma is thousands separator
        cleanAmount = cleanAmount.replace(/,/g, '');
      }
    } else {
      // US format (comma for thousands, dot for decimal)
      cleanAmount = cleanAmount.replace(/,(?=\d{3})/g, '');
    }
  }

  const parsed = parseFloat(cleanAmount);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert and format currency in one operation
 */
export function convertAndFormat(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  locale?: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const convertedAmount = currencyService.convert(amount, fromCurrency, toCurrency);
  return formatCurrency(convertedAmount, toCurrency, locale, options);
}

/**
 * Format large numbers with appropriate units (K, M, B)
 */
export function formatLargeAmount(
  amount: number,
  currency: Currency,
  locale?: Locale,
  precision: number = 1
): string {
  const absAmount = Math.abs(amount);
  let formattedNumber: string;
  let unit: string;

  if (absAmount >= 1_000_000_000) {
    formattedNumber = (amount / 1_000_000_000).toFixed(precision);
    unit = 'B';
  } else if (absAmount >= 1_000_000) {
    formattedNumber = (amount / 1_000_000).toFixed(precision);
    unit = 'M';
  } else if (absAmount >= 1_000) {
    formattedNumber = (amount / 1_000).toFixed(precision);
    unit = 'K';
  } else {
    return formatCurrency(amount, currency, locale);
  }

  const symbol = getCurrencySymbol(currency);
  const config = CURRENCY_CONFIG[currency];
  
  if (config.prefix) {
    return `${symbol}${formattedNumber}${unit}`;
  } else {
    return `${formattedNumber}${unit} ${symbol}`;
  }
}

/**
 * Validate currency code
 */
export function isValidCurrency(currency: string): currency is Currency {
  return Object.keys(CURRENCY_CONFIG).includes(currency);
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.keys(CURRENCY_CONFIG) as Currency[];
}

/**
 * Calculate percentage difference between two amounts
 */
export function calculatePercentageDifference(
  baseAmount: number,
  comparisonAmount: number
): number {
  if (baseAmount === 0) {
    return comparisonAmount === 0 ? 0 : 100;
  }
  return ((comparisonAmount - baseAmount) / Math.abs(baseAmount)) * 100;
}

/**
 * Format percentage with proper localization
 */
export function formatPercentage(
  percentage: number,
  locale?: Locale,
  decimals: number = 1
): string {
  const formatLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
  
  const formatter = new Intl.NumberFormat(formatLocale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(percentage / 100);
}

/**
 * Currency conversion utilities for calculations
 */
export const CurrencyUtils = {
  service: currencyService,
  format: formatCurrency,
  formatAmount,
  formatLarge: formatLargeAmount,
  parse: parseCurrency,
  convert: (amount: number, from: Currency, to: Currency) => 
    currencyService.convert(amount, from, to),
  convertAndFormat,
  symbol: getCurrencySymbol,
  config: (currency: Currency) => CURRENCY_CONFIG[currency],
  isValid: isValidCurrency,
  supported: getSupportedCurrencies,
  percentage: formatPercentage,
  percentageDiff: calculatePercentageDifference,
};