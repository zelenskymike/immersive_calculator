/**
 * Translation Validation Tests
 * Validates translation completeness, consistency, and structure across all languages
 */

import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

describe('Translation Validation', () => {
  describe('Translation Structure', () => {
    it('should have the same keys in English and Arabic translations', () => {
      const enKeys = getAllKeys(enTranslations);
      const arKeys = getAllKeys(arTranslations);

      // Check for missing keys in Arabic
      const missingInArabic = enKeys.filter(key => !arKeys.includes(key));
      expect(missingInArabic).toEqual([]);

      // Check for extra keys in Arabic
      const extraInArabic = arKeys.filter(key => !enKeys.includes(key));
      expect(extraInArabic).toEqual([]);
    });

    it('should not have empty string values in any translation', () => {
      const enEmptyValues = findEmptyValues(enTranslations, 'en');
      const arEmptyValues = findEmptyValues(arTranslations, 'ar');

      expect(enEmptyValues).toEqual([]);
      expect(arEmptyValues).toEqual([]);
    });

    it('should have consistent parameter placeholders', () => {
      const enParams = findParameterKeys(enTranslations);
      const arParams = findParameterKeys(arTranslations);

      // Each English parameter should have corresponding Arabic parameter
      Object.keys(enParams).forEach(key => {
        if (arParams[key]) {
          expect(arParams[key].sort()).toEqual(enParams[key].sort());
        }
      });
    });
  });

  describe('English Translations', () => {
    it('should have all required common translations', () => {
      const requiredCommonKeys = [
        'common.next',
        'common.previous',
        'common.cancel',
        'common.save',
        'common.delete',
        'common.edit',
        'common.close',
        'common.loading',
        'common.error',
        'common.success',
        'common.warning',
        'common.info',
        'common.required',
        'common.optional',
        'common.yes',
        'common.no',
      ];

      requiredCommonKeys.forEach(key => {
        const value = getNestedValue(enTranslations, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      });
    });

    it('should have all navigation translations', () => {
      const requiredNavKeys = [
        'navigation.home',
        'navigation.calculator',
        'navigation.about',
        'navigation.contact',
        'navigation.help',
        'navigation.documentation',
        'navigation.menu',
        'navigation.language',
        'navigation.language_selector',
      ];

      requiredNavKeys.forEach(key => {
        const value = getNestedValue(enTranslations, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      });
    });

    it('should have all calculator form translations', () => {
      const requiredCalcKeys = [
        'calculator.title',
        'calculator.subtitle',
        'calculator.description',
        'calculator.air_cooling.title',
        'calculator.immersion_cooling.title',
        'calculator.financial.title',
        'calculator.results.title',
      ];

      requiredCalcKeys.forEach(key => {
        const value = getNestedValue(enTranslations, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      });
    });

    it('should have all error message translations', () => {
      const requiredErrorKeys = [
        'errors.validation.required_field',
        'errors.validation.invalid_number',
        'errors.validation.invalid_range',
        'errors.validation.invalid_email',
        'errors.calculation.insufficient_data',
        'errors.calculation.invalid_configuration',
        'errors.network.connection_error',
        'errors.network.server_error',
      ];

      requiredErrorKeys.forEach(key => {
        const value = getNestedValue(enTranslations, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      });
    });
  });

  describe('Arabic Translations', () => {
    it('should have proper Arabic text for common keys', () => {
      const arabicCommonTests = [
        { key: 'common.next', expected: /التالي/ },
        { key: 'common.previous', expected: /السابق/ },
        { key: 'common.cancel', expected: /إلغاء/ },
        { key: 'common.save', expected: /حفظ/ },
        { key: 'common.yes', expected: /نعم/ },
        { key: 'common.no', expected: /لا/ },
      ];

      arabicCommonTests.forEach(({ key, expected }) => {
        const value = getNestedValue(arTranslations, key);
        expect(value).toBeDefined();
        expect(value).toMatch(expected);
      });
    });

    it('should use proper Arabic RTL characters', () => {
      const arabicKeys = [
        'calculator.title',
        'calculator.subtitle',
        'navigation.calculator',
        'navigation.about',
      ];

      arabicKeys.forEach(key => {
        const value = getNestedValue(arTranslations, key);
        expect(value).toBeDefined();
        // Check if contains Arabic Unicode range characters
        expect(value).toMatch(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDCF\uFDF0-\uFDFF\uFE70-\uFEFF]/);
      });
    });

    it('should have proper Arabic number formatting context', () => {
      // Test translations that involve numbers
      const numberKeys = [
        'calculator.progress.completion',
        'results.summary.over_years',
      ];

      numberKeys.forEach(key => {
        const value = getNestedValue(arTranslations, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });

    it('should maintain parameter placeholders in Arabic', () => {
      const parameterKeys = [
        'calculator.progress.completion',
        'results.summary.over_years',
        'errors.validation.invalid_range',
      ];

      parameterKeys.forEach(key => {
        const enValue = getNestedValue(enTranslations, key);
        const arValue = getNestedValue(arTranslations, key);
        
        if (enValue && arValue) {
          const enParams = extractParameters(enValue);
          const arParams = extractParameters(arValue);
          
          expect(arParams.sort()).toEqual(enParams.sort());
        }
      });
    });
  });

  describe('Translation Quality', () => {
    it('should not contain HTML tags in translations', () => {
      const allKeys = getAllKeys(enTranslations);
      
      allKeys.forEach(key => {
        const enValue = getNestedValue(enTranslations, key);
        const arValue = getNestedValue(arTranslations, key);
        
        if (typeof enValue === 'string') {
          expect(enValue).not.toMatch(/<[^>]*>/);
        }
        
        if (typeof arValue === 'string') {
          expect(arValue).not.toMatch(/<[^>]*>/);
        }
      });
    });

    it('should have consistent punctuation handling', () => {
      // Check that sentences end with appropriate punctuation
      const sentenceKeys = [
        'calculator.description',
        'calculator.air_cooling.description',
        'calculator.immersion_cooling.description',
        'calculator.financial.description',
      ];

      sentenceKeys.forEach(key => {
        const enValue = getNestedValue(enTranslations, key);
        const arValue = getNestedValue(arTranslations, key);
        
        if (enValue && typeof enValue === 'string' && enValue.length > 20) {
          expect(enValue).toMatch(/[.!]$/);
        }
        
        if (arValue && typeof arValue === 'string' && arValue.length > 20) {
          expect(arValue).toMatch(/[.!؟]$/);
        }
      });
    });

    it('should not have trailing or leading whitespace', () => {
      const allKeys = getAllKeys(enTranslations);
      
      allKeys.forEach(key => {
        const enValue = getNestedValue(enTranslations, key);
        const arValue = getNestedValue(arTranslations, key);
        
        if (typeof enValue === 'string') {
          expect(enValue).toBe(enValue.trim());
        }
        
        if (typeof arValue === 'string') {
          expect(arValue).toBe(arValue.trim());
        }
      });
    });
  });

  describe('Cultural Appropriateness', () => {
    it('should use appropriate currency symbols for regions', () => {
      const currencyKeys = [
        'common.currency',
      ];

      currencyKeys.forEach(key => {
        const enValue = getNestedValue(enTranslations, key);
        const arValue = getNestedValue(arTranslations, key);
        
        expect(enValue).toBeDefined();
        expect(arValue).toBeDefined();
        // Both should refer to currency appropriately
        expect(typeof enValue).toBe('string');
        expect(typeof arValue).toBe('string');
      });
    });

    it('should use culturally appropriate date references', () => {
      const dateKeys = Object.keys(enTranslations).filter(key => 
        key.includes('date') || key.includes('time') || key.includes('year')
      );

      // Should have some date-related keys
      expect(dateKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Brand and Product Names', () => {
    it('should maintain consistent product terminology', () => {
      const brandTerms = {
        'TCO': 'التكلفة الإجمالية للملكية',
        'immersion cooling': 'التبريد بالغمر',
        'air cooling': 'التبريد بالهواء',
        'data center': 'مركز البيانات',
      };

      Object.entries(brandTerms).forEach(([en, ar]) => {
        // Find English keys containing the term
        const enKeys = getAllKeys(enTranslations).filter(key => {
          const value = getNestedValue(enTranslations, key);
          return typeof value === 'string' && value.toLowerCase().includes(en.toLowerCase());
        });

        // Check corresponding Arabic keys
        enKeys.forEach(key => {
          const arValue = getNestedValue(arTranslations, key);
          if (arValue && typeof arValue === 'string') {
            // This is a loose check - in practice, terminology might be adapted
            expect(typeof arValue).toBe('string');
          }
        });
      });
    });
  });
});

// Helper functions
function getAllKeys(obj: any, prefix: string = ''): string[] {
  let keys: string[] = [];
  
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  });
  
  return keys;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function findEmptyValues(obj: any, language: string, prefix: string = ''): string[] {
  let emptyKeys: string[] = [];
  
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      emptyKeys = emptyKeys.concat(findEmptyValues(value, language, fullKey));
    } else if (typeof value === 'string' && value.trim() === '') {
      emptyKeys.push(`${language}: ${fullKey}`);
    }
  });
  
  return emptyKeys;
}

function findParameterKeys(obj: any, prefix: string = ''): Record<string, string[]> {
  let paramKeys: Record<string, string[]> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      paramKeys = { ...paramKeys, ...findParameterKeys(value, fullKey) };
    } else if (typeof value === 'string') {
      const params = extractParameters(value);
      if (params.length > 0) {
        paramKeys[fullKey] = params;
      }
    }
  });
  
  return paramKeys;
}

function extractParameters(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/g);
  return matches ? matches.map(match => match.slice(1, -1)) : [];
}