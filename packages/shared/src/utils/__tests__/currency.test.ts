/**
 * Comprehensive test suite for currency utilities
 * Tests all currency conversion, formatting, and validation functions
 */

import {
  CurrencyService,
  currencyService,
  formatCurrency,
  formatAmount,
  formatLargeAmount,
  formatPercentage,
  parseCurrency,
  convertAndFormat,
  getCurrencySymbol,
  isValidCurrency,
  getSupportedCurrencies,
  calculatePercentageDifference,
  CurrencyUtils,
} from '../currency';
import type { Currency, Locale } from '../../types/common';

describe('CurrencyService', () => {
  let service: CurrencyService;

  beforeEach(() => {
    service = new CurrencyService();
    service.setExchangeRates({
      USD_EUR: 0.85,
      USD_SAR: 3.75,
      EUR_USD: 1.18,
      SAR_USD: 0.27,
    });
  });

  describe('Exchange Rate Management', () => {
    it('should set and get exchange rates', () => {
      const rates = { USD_EUR: 0.90, EUR_USD: 1.11 };
      service.setExchangeRates(rates);
      
      expect(service.getExchangeRates()).toEqual(rates);
    });

    it('should track last update time', () => {
      const beforeTime = Date.now();
      service.setExchangeRates({ USD_EUR: 0.85 });
      const afterTime = Date.now();
      
      // Should have updated recently (within 1 second)
      expect(service.needsUpdate()).toBe(false);
    });

    it('should indicate when rates need updating', () => {
      // Mock an old timestamp
      const oldTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      (service as any).lastUpdateTime = oldTime;
      
      expect(service.needsUpdate()).toBe(true);
    });
  });

  describe('Currency Conversion', () => {
    it('should return same amount for same currency', () => {
      expect(service.convert(100, 'USD', 'USD')).toBe(100);
      expect(service.convert(50.75, 'EUR', 'EUR')).toBe(50.75);
    });

    it('should convert using direct exchange rates', () => {
      expect(service.convert(100, 'USD', 'EUR')).toBe(85); // 100 * 0.85
      expect(service.convert(200, 'USD', 'SAR')).toBe(750); // 200 * 3.75
    });

    it('should convert using inverse exchange rates', () => {
      expect(service.convert(85, 'EUR', 'USD')).toBeCloseTo(100.3, 1); // 85 * 1.18
      expect(service.convert(100, 'SAR', 'USD')).toBeCloseTo(27, 1); // 100 * 0.27
    });

    it('should throw error for missing exchange rates', () => {
      expect(() => {
        service.convert(100, 'USD', 'AED');
      }).toThrow('Exchange rate not available for USD to AED');
    });

    it('should handle zero amounts', () => {
      expect(service.convert(0, 'USD', 'EUR')).toBe(0);
    });

    it('should handle negative amounts', () => {
      expect(service.convert(-100, 'USD', 'EUR')).toBe(-85);
    });
  });

  describe('Currency Configuration', () => {
    it('should return correct currency configuration', () => {
      const usdConfig = service.getCurrencyConfig('USD');
      expect(usdConfig.symbol).toBe('$');
      expect(usdConfig.prefix).toBe(true);
      expect(usdConfig.decimals).toBe(2);
    });
  });
});

describe('Currency Formatting', () => {
  describe('formatCurrency', () => {
    it('should format USD amounts correctly', () => {
      expect(formatCurrency(1234.56, 'USD')).toContain('1,234.56');
      expect(formatCurrency(1234.56, 'USD')).toContain('$');
    });

    it('should format EUR amounts correctly', () => {
      expect(formatCurrency(1234.56, 'EUR')).toContain('1');
      expect(formatCurrency(1234.56, 'EUR')).toContain('€');
    });

    it('should format SAR amounts correctly', () => {
      const formatted = formatCurrency(1234.56, 'SAR', 'ar');
      expect(formatted).toContain('ر.س');
    });

    it('should format AED amounts correctly', () => {
      const formatted = formatCurrency(1234.56, 'AED', 'ar');
      expect(formatted).toContain('د.إ');
    });

    it('should handle zero amounts', () => {
      expect(formatCurrency(0, 'USD')).toContain('0.00');
    });

    it('should handle negative amounts', () => {
      const formatted = formatCurrency(-1234.56, 'USD');
      expect(formatted).toContain('-');
      expect(formatted).toContain('1,234.56');
    });

    it('should respect custom options', () => {
      const formatted = formatCurrency(1234.567, 'USD', 'en', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
      expect(formatted).toContain('1,234.567');
    });
  });

  describe('formatAmount', () => {
    it('should format amount without currency symbol', () => {
      const formatted = formatAmount(1234.56, 'USD');
      expect(formatted).toContain('1,234.56');
      expect(formatted).not.toContain('$');
    });

    it('should handle different locales', () => {
      const formatted = formatAmount(1234.56, 'USD', 'ar');
      expect(formatted).toBeDefined();
    });
  });

  describe('formatLargeAmount', () => {
    it('should format thousands with K suffix', () => {
      expect(formatLargeAmount(1500, 'USD')).toContain('1.5');
      expect(formatLargeAmount(1500, 'USD')).toContain('K');
    });

    it('should format millions with M suffix', () => {
      expect(formatLargeAmount(1500000, 'USD')).toContain('1.5');
      expect(formatLargeAmount(1500000, 'USD')).toContain('M');
    });

    it('should format billions with B suffix', () => {
      expect(formatLargeAmount(1500000000, 'USD')).toContain('1.5');
      expect(formatLargeAmount(1500000000, 'USD')).toContain('B');
    });

    it('should format small amounts normally', () => {
      const formatted = formatLargeAmount(500, 'USD');
      expect(formatted).not.toContain('K');
      expect(formatted).toContain('$500.00');
    });

    it('should respect precision parameter', () => {
      expect(formatLargeAmount(1234567, 'USD', 'en', 2)).toContain('1.23M');
    });

    it('should handle prefix and suffix currencies correctly', () => {
      const usdFormatted = formatLargeAmount(1500000, 'USD');
      const eurFormatted = formatLargeAmount(1500000, 'EUR');
      
      expect(usdFormatted).toMatch(/\$1\.5M/);
      expect(eurFormatted).toMatch(/1\.5M €/);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(formatPercentage(25.5)).toContain('25.5');
      expect(formatPercentage(25.5)).toContain('%');
    });

    it('should handle zero percentage', () => {
      expect(formatPercentage(0)).toContain('0');
    });

    it('should handle negative percentages', () => {
      const formatted = formatPercentage(-15.2);
      expect(formatted).toContain('-');
      expect(formatted).toContain('15.2');
    });

    it('should respect decimal places', () => {
      expect(formatPercentage(25.567, 'en', 2)).toContain('25.57');
    });

    it('should format for Arabic locale', () => {
      const formatted = formatPercentage(25.5, 'ar');
      expect(formatted).toBeDefined();
    });
  });
});

describe('Currency Parsing', () => {
  describe('parseCurrency', () => {
    it('should parse USD formatted amounts', () => {
      expect(parseCurrency('$1,234.56', 'USD')).toBeCloseTo(1234.56);
      expect(parseCurrency('$1,234', 'USD')).toBe(1234);
      expect(parseCurrency('$0.99', 'USD')).toBeCloseTo(0.99);
    });

    it('should parse EUR formatted amounts', () => {
      expect(parseCurrency('1.234,56 €', 'EUR')).toBeCloseTo(1234.56);
      expect(parseCurrency('€1,234.56', 'EUR')).toBeCloseTo(1234.56);
    });

    it('should handle amounts without symbols', () => {
      expect(parseCurrency('1,234.56', 'USD')).toBeCloseTo(1234.56);
      expect(parseCurrency('1234.56', 'USD')).toBeCloseTo(1234.56);
    });

    it('should handle negative amounts', () => {
      expect(parseCurrency('-$1,234.56', 'USD')).toBeCloseTo(-1234.56);
    });

    it('should return 0 for invalid input', () => {
      expect(parseCurrency('invalid', 'USD')).toBe(0);
      expect(parseCurrency('', 'USD')).toBe(0);
      expect(parseCurrency('$$$', 'USD')).toBe(0);
    });

    it('should handle Arabic numerals', () => {
      expect(parseCurrency('١٢٣٤.٥٦ ر.س', 'SAR', 'ar')).toBeDefined();
    });
  });
});

describe('Utility Functions', () => {
  describe('convertAndFormat', () => {
    it('should convert and format in one operation', () => {
      // Mock the currency service for consistent testing
      currencyService.setExchangeRates({ USD_EUR: 0.85 });
      
      const result = convertAndFormat(100, 'USD', 'EUR');
      expect(result).toContain('85');
      expect(result).toContain('€');
    });

    it('should handle same currency conversion', () => {
      const result = convertAndFormat(100, 'USD', 'USD');
      expect(result).toContain('$100.00');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbols for all currencies', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('SAR')).toBe('ر.س');
      expect(getCurrencySymbol('AED')).toBe('د.إ');
    });
  });

  describe('isValidCurrency', () => {
    it('should validate supported currencies', () => {
      expect(isValidCurrency('USD')).toBe(true);
      expect(isValidCurrency('EUR')).toBe(true);
      expect(isValidCurrency('SAR')).toBe(true);
      expect(isValidCurrency('AED')).toBe(true);
    });

    it('should reject unsupported currencies', () => {
      expect(isValidCurrency('GBP')).toBe(false);
      expect(isValidCurrency('JPY')).toBe(false);
      expect(isValidCurrency('invalid')).toBe(false);
      expect(isValidCurrency('')).toBe(false);
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return all supported currencies', () => {
      const supported = getSupportedCurrencies();
      expect(supported).toContain('USD');
      expect(supported).toContain('EUR');
      expect(supported).toContain('SAR');
      expect(supported).toContain('AED');
      expect(supported).toHaveLength(4);
    });
  });

  describe('calculatePercentageDifference', () => {
    it('should calculate positive differences', () => {
      expect(calculatePercentageDifference(100, 120)).toBe(20);
      expect(calculatePercentageDifference(50, 75)).toBe(50);
    });

    it('should calculate negative differences', () => {
      expect(calculatePercentageDifference(100, 80)).toBe(-20);
      expect(calculatePercentageDifference(200, 150)).toBe(-25);
    });

    it('should handle zero base amount', () => {
      expect(calculatePercentageDifference(0, 100)).toBe(100);
      expect(calculatePercentageDifference(0, 0)).toBe(0);
    });

    it('should handle negative base amounts', () => {
      expect(calculatePercentageDifference(-100, -80)).toBe(-20);
      expect(calculatePercentageDifference(-50, -75)).toBe(50);
    });
  });
});

describe('CurrencyUtils Object', () => {
  it('should expose all utility functions', () => {
    expect(typeof CurrencyUtils.format).toBe('function');
    expect(typeof CurrencyUtils.formatAmount).toBe('function');
    expect(typeof CurrencyUtils.formatLarge).toBe('function');
    expect(typeof CurrencyUtils.parse).toBe('function');
    expect(typeof CurrencyUtils.convert).toBe('function');
    expect(typeof CurrencyUtils.convertAndFormat).toBe('function');
    expect(typeof CurrencyUtils.symbol).toBe('function');
    expect(typeof CurrencyUtils.config).toBe('function');
    expect(typeof CurrencyUtils.isValid).toBe('function');
    expect(typeof CurrencyUtils.percentage).toBe('function');
    expect(typeof CurrencyUtils.percentageDiff).toBe('function');
  });

  it('should have currency service instance', () => {
    expect(CurrencyUtils.service).toBeDefined();
    expect(typeof CurrencyUtils.service.convert).toBe('function');
  });

  it('should provide supported currencies', () => {
    const supported = CurrencyUtils.supported();
    expect(Array.isArray(supported)).toBe(true);
    expect(supported.length).toBeGreaterThan(0);
  });
});

describe('Edge Cases and Error Handling', () => {
  describe('Extreme Values', () => {
    it('should handle very large numbers', () => {
      const largeAmount = 999999999999;
      expect(() => formatCurrency(largeAmount, 'USD')).not.toThrow();
      expect(formatLargeAmount(largeAmount, 'USD')).toContain('B');
    });

    it('should handle very small numbers', () => {
      const smallAmount = 0.001;
      expect(() => formatCurrency(smallAmount, 'USD')).not.toThrow();
      expect(formatCurrency(smallAmount, 'USD')).toContain('0.00');
    });

    it('should handle infinity and NaN', () => {
      expect(formatCurrency(Infinity, 'USD')).toBeDefined();
      expect(formatCurrency(NaN, 'USD')).toBeDefined();
    });
  });

  describe('Invalid Inputs', () => {
    it('should handle undefined and null values gracefully', () => {
      expect(() => formatCurrency(undefined as any, 'USD')).not.toThrow();
      expect(() => formatCurrency(null as any, 'USD')).not.toThrow();
    });

    it('should handle invalid currency codes in parsing', () => {
      expect(() => parseCurrency('$100', 'INVALID' as Currency)).not.toThrow();
    });

    it('should handle malformed currency strings', () => {
      expect(parseCurrency('$$$100$$$', 'USD')).toBeCloseTo(100);
      expect(parseCurrency('abc123def', 'USD')).toBeCloseTo(123);
    });
  });

  describe('Locale Edge Cases', () => {
    it('should handle unsupported locales gracefully', () => {
      expect(() => formatCurrency(100, 'USD', 'fr' as Locale)).not.toThrow();
      expect(() => formatPercentage(50, 'de' as Locale)).not.toThrow();
    });

    it('should handle mixed locale currency combinations', () => {
      expect(() => formatCurrency(100, 'SAR', 'en')).not.toThrow();
      expect(() => formatCurrency(100, 'USD', 'ar')).not.toThrow();
    });
  });
});

describe('Performance and Caching', () => {
  it('should cache exchange rates properly', () => {
    const service = new CurrencyService();
    const rates = { USD_EUR: 0.85, EUR_USD: 1.18 };
    
    service.setExchangeRates(rates);
    expect(service.needsUpdate()).toBe(false);
    
    // Simulate time passage
    (service as any).lastUpdateTime = Date.now() - (2 * 60 * 60 * 1000);
    expect(service.needsUpdate()).toBe(true);
  });

  it('should perform currency conversions quickly', () => {
    const service = new CurrencyService();
    service.setExchangeRates({ USD_EUR: 0.85 });
    
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      service.convert(100 + i, 'USD', 'EUR');
    }
    const endTime = Date.now();
    
    // Should complete 1000 conversions in less than 100ms
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('should format currencies quickly', () => {
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      formatCurrency(1234.56 + i, 'USD');
    }
    const endTime = Date.now();
    
    // Should complete 1000 formatting operations in reasonable time
    expect(endTime - startTime).toBeLessThan(1000);
  });
});

describe('Real-world Usage Scenarios', () => {
  it('should handle typical TCO calculator amounts', () => {
    const amounts = [
      25000,    // Rack cost
      150000,   // HVAC system
      500000,   // Annual energy cost
      2500000,  // 5-year TCO
      15000000, // Large data center TCO
    ];

    amounts.forEach(amount => {
      expect(() => formatCurrency(amount, 'USD')).not.toThrow();
      expect(() => formatLargeAmount(amount, 'USD')).not.toThrow();
      
      const formatted = formatCurrency(amount, 'USD');
      expect(formatted).toBeDefined();
      expect(formatted).toContain('$');
    });
  });

  it('should handle multi-currency scenarios', () => {
    currencyService.setExchangeRates({
      USD_EUR: 0.85,
      USD_SAR: 3.75,
      USD_AED: 3.67,
    });

    const usdAmount = 100000; // $100K
    
    const eurAmount = currencyService.convert(usdAmount, 'USD', 'EUR');
    const sarAmount = currencyService.convert(usdAmount, 'USD', 'SAR');
    const aedAmount = currencyService.convert(usdAmount, 'USD', 'AED');

    expect(eurAmount).toBeCloseTo(85000);
    expect(sarAmount).toBeCloseTo(375000);
    expect(aedAmount).toBeCloseTo(367000);

    // Format in each currency
    expect(formatCurrency(eurAmount, 'EUR')).toContain('€');
    expect(formatCurrency(sarAmount, 'SAR')).toContain('ر.س');
    expect(formatCurrency(aedAmount, 'AED')).toContain('د.إ');
  });

  it('should handle percentage calculations for savings', () => {
    const airCoolingCost = 1000000;
    const immersionCoolingCost = 750000;
    
    const savingsPercent = calculatePercentageDifference(airCoolingCost, immersionCoolingCost);
    expect(savingsPercent).toBe(-25); // 25% savings
    
    const formattedPercent = formatPercentage(Math.abs(savingsPercent));
    expect(formattedPercent).toContain('25');
    expect(formattedPercent).toContain('%');
  });
});