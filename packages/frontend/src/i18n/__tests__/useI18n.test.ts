/**
 * Internationalization Hook Tests
 * Tests translation functionality, RTL layout, and cultural formatting
 */

import { renderHook, act } from '@testing-library/react';
import { useI18n } from '../useI18n';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock document properties
Object.defineProperty(document, 'documentElement', {
  value: {
    dir: '',
    lang: '',
  },
  writable: true,
});

// Mock meta description element
const mockMetaDescription = {
  setAttribute: jest.fn(),
};
document.querySelector = jest.fn((selector) => {
  if (selector === 'meta[name="description"]') {
    return mockMetaDescription;
  }
  return null;
});

// Mock navigator language
Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  configurable: true,
});

describe('useI18n Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  describe('Language Detection and Initialization', () => {
    it('should detect English as default language', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.locale).toBe('en');
      expect(result.current.direction).toBe('ltr');
      expect(result.current.isRTL).toBe(false);
    });

    it('should detect Arabic from browser language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'ar-SA',
        configurable: true,
      });

      const { result } = renderHook(() => useI18n());
      
      expect(result.current.locale).toBe('ar');
      expect(result.current.direction).toBe('rtl');
      expect(result.current.isRTL).toBe(true);
    });

    it('should restore locale from localStorage', () => {
      mockLocalStorage.setItem('tco-calculator-locale', 'ar');

      const { result } = renderHook(() => useI18n());
      
      expect(result.current.locale).toBe('ar');
      expect(result.current.isRTL).toBe(true);
    });

    it('should set document properties on mount', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('Language Switching', () => {
    it('should switch to Arabic and update document properties', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      expect(result.current.locale).toBe('ar');
      expect(result.current.isRTL).toBe(true);
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('tco-calculator-locale', 'ar');
    });

    it('should switch back to English from Arabic', () => {
      const { result } = renderHook(() => useI18n());
      
      // First switch to Arabic
      act(() => {
        result.current.setLocale('ar');
      });
      
      // Then switch back to English
      act(() => {
        result.current.setLocale('en');
      });
      
      expect(result.current.locale).toBe('en');
      expect(result.current.isRTL).toBe(false);
      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('Translation Function', () => {
    it('should translate simple keys', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.t('common.next')).toBe('Next');
      expect(result.current.t('common.previous')).toBe('Previous');
      expect(result.current.t('common.cancel')).toBe('Cancel');
    });

    it('should translate nested keys', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.t('calculator.title')).toBe('Immersion Cooling TCO Calculator');
      expect(result.current.t('navigation.calculator')).toBe('Calculator');
      expect(result.current.t('footer.copyright')).toBe('© 2024 TCO Calculator. All rights reserved.');
    });

    it('should handle parameter interpolation', () => {
      const { result } = renderHook(() => useI18n());
      
      const translated = result.current.t('calculator.progress.completion', {
        percentage: 75,
        current: 3,
        total: 4,
      });
      
      expect(translated).toBe('Progress: 75% complete (Step 3 of 4)');
    });

    it('should fallback to English for missing Arabic translations', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      // Should fallback to English if key doesn't exist in Arabic
      const englishFallback = result.current.t('non.existent.key');
      expect(englishFallback).toBe('non.existent.key');
    });

    it('should return key when translation is not found', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.t('missing.translation.key')).toBe('missing.translation.key');
    });
  });

  describe('Arabic Language Support', () => {
    it('should provide correct Arabic translations', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      expect(result.current.t('common.next')).toBe('التالي');
      expect(result.current.t('common.previous')).toBe('السابق');
      expect(result.current.t('common.cancel')).toBe('إلغاء');
      expect(result.current.t('calculator.title')).toBe('حاسبة التكلفة الإجمالية للملكية للتبريد بالغمر');
    });

    it('should handle Arabic parameter interpolation', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      const translated = result.current.t('calculator.progress.completion', {
        percentage: 75,
        current: 3,
        total: 4,
      });
      
      expect(translated).toBe('التقدم: 75% مكتمل (الخطوة 3 من 4)');
    });
  });

  describe('Number Formatting', () => {
    it('should format English numbers correctly', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.formatNumber(1234.56)).toBe('1,234.56');
      expect(result.current.formatNumber(1000000)).toBe('1,000,000');
    });

    it('should format Arabic numbers with Arabic-Indic digits', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      const formatted = result.current.formatNumber(1234.56);
      // Arabic numbers use Arabic-Indic digits
      expect(formatted).toMatch(/[٠-٩]/);
    });

    it('should format large numbers with appropriate suffixes', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.formatLargeNumber(1500)).toBe('1.5K');
      expect(result.current.formatLargeNumber(2500000)).toBe('2.5M');
      expect(result.current.formatLargeNumber(1200000000)).toBe('1.2B');
    });

    it('should format Arabic large numbers with Arabic suffixes', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      expect(result.current.formatLargeNumber(1500)).toContain('ك'); // Arabic 'K'
      expect(result.current.formatLargeNumber(2500000)).toContain('م'); // Arabic 'M'
      expect(result.current.formatLargeNumber(1200000000)).toContain('ب'); // Arabic 'B'
    });
  });

  describe('Currency Formatting', () => {
    it('should format USD currency correctly', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.formatCurrency(1234.56, 'USD')).toBe('$1,235');
      expect(result.current.formatCurrency(1000, 'USD')).toBe('$1,000');
    });

    it('should format EUR currency correctly', () => {
      const { result } = renderHook(() => useI18n());
      
      const formatted = result.current.formatCurrency(1234.56, 'EUR');
      expect(formatted).toContain('€');
      expect(formatted).toContain('1,235');
    });

    it('should format Arabic currencies correctly', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      const formattedSAR = result.current.formatCurrency(1000, 'SAR');
      const formattedAED = result.current.formatCurrency(1000, 'AED');
      
      expect(formattedSAR).toContain('ريال');
      expect(formattedAED).toContain('درهم');
    });
  });

  describe('Date Formatting', () => {
    it('should format English dates correctly', () => {
      const { result } = renderHook(() => useI18n());
      const testDate = new Date('2024-01-15T10:30:00');
      
      const formatted = result.current.formatDate(testDate);
      expect(formatted).toMatch(/Jan|January/);
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format Arabic dates correctly', () => {
      const { result } = renderHook(() => useI18n());
      const testDate = new Date('2024-01-15T10:30:00');
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      const formatted = result.current.formatDate(testDate);
      // Arabic dates should contain Arabic month names and numbers
      expect(formatted).toMatch(/[يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر]/);
    });
  });

  describe('Percentage Formatting', () => {
    it('should format percentages correctly in English', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.formatPercentage(75.5)).toBe('75.5%');
      expect(result.current.formatPercentage(100)).toBe('100.0%');
    });

    it('should format percentages correctly in Arabic', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      const formatted = result.current.formatPercentage(75.5);
      expect(formatted).toContain('%');
      // Should use Arabic-Indic digits
      expect(formatted).toMatch(/[٠-٩]/);
    });
  });

  describe('Validation Message Helper', () => {
    it('should generate validation messages in English', () => {
      const { result } = renderHook(() => useI18n());
      
      const message = result.current.getValidationMessage('required_field');
      expect(message).toBe('This field is required');
    });

    it('should generate validation messages with parameters', () => {
      const { result } = renderHook(() => useI18n());
      
      const message = result.current.getValidationMessage('invalid_range', undefined, {
        min: 1,
        max: 100,
      });
      expect(message).toBe('Value must be between 1 and 100');
    });

    it('should generate validation messages in Arabic', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      const message = result.current.getValidationMessage('required_field');
      expect(message).toBe('هذا الحقل مطلوب');
    });
  });

  describe('URL Localization', () => {
    it('should not modify URLs for English locale', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.localizeUrl('/calculator')).toBe('/calculator');
      expect(result.current.localizeUrl('/about')).toBe('/about');
    });

    it('should add Arabic prefix to URLs', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      expect(result.current.localizeUrl('/calculator')).toBe('/ar/calculator');
      expect(result.current.localizeUrl('/about')).toBe('/ar/about');
    });

    it('should remove locale prefix from URLs', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      expect(result.current.delocalizeUrl('/ar/calculator')).toBe('/calculator');
      expect(result.current.delocalizeUrl('/ar/about')).toBe('/about');
    });
  });

  describe('Locale Utilities', () => {
    it('should return available locales', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.availableLocales).toEqual(['en', 'ar']);
    });

    it('should return display names for locales', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.getLocaleDisplayName('en')).toBe('English');
      expect(result.current.getLocaleDisplayName('ar')).toBe('العربية');
    });
  });

  describe('MUI Theme Integration', () => {
    it('should provide theme with correct direction for LTR', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.theme.direction).toBe('ltr');
      expect(result.current.direction).toBe('ltr');
    });

    it('should provide theme with correct direction for RTL', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      expect(result.current.theme.direction).toBe('rtl');
      expect(result.current.direction).toBe('rtl');
    });

    it('should use correct font family for Arabic', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      expect(result.current.theme.typography.fontFamily).toContain('Noto Sans Arabic');
    });

    it('should provide emotion cache for RTL', () => {
      const { result } = renderHook(() => useI18n());
      
      act(() => {
        result.current.setLocale('ar');
      });
      
      expect(result.current.emotionCache).toBeDefined();
      expect(result.current.emotionCache.key).toBe('muirtl');
    });
  });
});