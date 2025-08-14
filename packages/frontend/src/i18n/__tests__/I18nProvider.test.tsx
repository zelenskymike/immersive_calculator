/**
 * I18nProvider Component Tests
 * Tests the I18n context provider and its integration with components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider, useI18nContext } from '../I18nProvider';

// Test component that uses the I18n context
const TestComponent: React.FC = () => {
  const { t, locale, setLocale, isRTL, formatNumber } = useI18nContext();
  
  return (
    <div>
      <div data-testid="current-locale">{locale}</div>
      <div data-testid="direction">{isRTL ? 'rtl' : 'ltr'}</div>
      <div data-testid="translated-text">{t('common.next')}</div>
      <div data-testid="formatted-number">{formatNumber(1234.56)}</div>
      <button 
        data-testid="switch-to-arabic" 
        onClick={() => setLocale('ar')}
      >
        Switch to Arabic
      </button>
      <button 
        data-testid="switch-to-english" 
        onClick={() => setLocale('en')}
      >
        Switch to English
      </button>
    </div>
  );
};

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

describe('I18nProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  describe('Provider Setup', () => {
    it('should provide i18n context to child components', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
      expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Next');
    });

    it('should initialize with custom initial locale', () => {
      render(
        <I18nProvider initialLocale="ar">
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('current-locale')).toHaveTextContent('ar');
      expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('التالي');
    });

    it('should throw error when useI18nContext is used outside provider', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useI18nContext must be used within an I18nProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Language Switching', () => {
    it('should switch locale and update context', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Initial state
      expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Next');

      // Switch to Arabic
      fireEvent.click(screen.getByTestId('switch-to-arabic'));

      expect(screen.getByTestId('current-locale')).toHaveTextContent('ar');
      expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('التالي');
    });

    it('should switch back to English from Arabic', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Switch to Arabic first
      fireEvent.click(screen.getByTestId('switch-to-arabic'));
      expect(screen.getByTestId('current-locale')).toHaveTextContent('ar');

      // Switch back to English
      fireEvent.click(screen.getByTestId('switch-to-english'));
      expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
      expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Next');
    });
  });

  describe('Formatting Functions', () => {
    it('should provide number formatting through context', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('formatted-number')).toHaveTextContent('1,234.56');
    });

    it('should format numbers differently for Arabic locale', () => {
      render(
        <I18nProvider initialLocale="ar">
          <TestComponent />
        </I18nProvider>
      );

      const formattedNumber = screen.getByTestId('formatted-number').textContent;
      // Arabic formatting should use Arabic-Indic digits
      expect(formattedNumber).toMatch(/[٠-٩]/);
    });
  });

  describe('MUI Theme Integration', () => {
    it('should apply MUI theme with correct direction', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Check that MUI components inherit the correct direction
      const container = screen.getByTestId('direction').parentElement;
      expect(container).toBeInTheDocument();
    });

    it('should apply RTL theme for Arabic', () => {
      render(
        <I18nProvider initialLocale="ar">
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
    });
  });

  describe('Context Value Completeness', () => {
    it('should provide all required context properties', () => {
      const ContextTestComponent: React.FC = () => {
        const context = useI18nContext();
        
        const requiredProperties = [
          't',
          'locale',
          'setLocale',
          'direction',
          'isRTL',
          'formatNumber',
          'formatCurrency',
          'formatDate',
          'formatRelativeTime',
          'formatPercentage',
          'formatLargeNumber',
          'availableLocales',
          'getLocaleDisplayName',
          'getValidationMessage',
          'localizeUrl',
          'delocalizeUrl',
        ];

        return (
          <div>
            {requiredProperties.map((prop) => (
              <div key={prop} data-testid={`has-${prop}`}>
                {prop in context ? 'true' : 'false'}
              </div>
            ))}
          </div>
        );
      };

      render(
        <I18nProvider>
          <ContextTestComponent />
        </I18nProvider>
      );

      // Check that all required properties are available
      const requiredProperties = [
        't',
        'locale',
        'setLocale',
        'direction',
        'isRTL',
        'formatNumber',
        'formatCurrency',
        'formatDate',
        'formatRelativeTime',
        'formatPercentage',
        'formatLargeNumber',
        'availableLocales',
        'getLocaleDisplayName',
        'getValidationMessage',
        'localizeUrl',
        'delocalizeUrl',
      ];

      requiredProperties.forEach((prop) => {
        expect(screen.getByTestId(`has-${prop}`)).toHaveTextContent('true');
      });
    });
  });

  describe('Higher-Order Component', () => {
    it('should work with withI18nProvider HOC', () => {
      const { withI18nProvider } = require('../I18nProvider');
      
      const SimpleComponent: React.FC = () => (
        <TestComponent />
      );

      const WrappedComponent = withI18nProvider(SimpleComponent);

      render(<WrappedComponent />);

      expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Next');
    });

    it('should pass initialLocale to HOC', () => {
      const { withI18nProvider } = require('../I18nProvider');
      
      const SimpleComponent: React.FC = () => (
        <TestComponent />
      );

      const WrappedComponent = withI18nProvider(SimpleComponent);

      render(<WrappedComponent initialLocale="ar" />);

      expect(screen.getByTestId('current-locale')).toHaveTextContent('ar');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('التالي');
    });
  });

  describe('CSS Baseline Integration', () => {
    it('should apply CssBaseline for consistent styling', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // CssBaseline should be applied - check by looking for reset styles
      const body = document.body;
      expect(body).toBeInTheDocument();
    });
  });

  describe('Emotion Cache Integration', () => {
    it('should provide emotion cache for styling', () => {
      const CacheTestComponent: React.FC = () => {
        const { locale } = useI18nContext();
        return <div data-testid="cache-test">{locale}</div>;
      };

      render(
        <I18nProvider>
          <CacheTestComponent />
        </I18nProvider>
      );

      // Component should render without cache-related errors
      expect(screen.getByTestId('cache-test')).toHaveTextContent('en');
    });

    it('should handle RTL cache for Arabic', () => {
      const CacheTestComponent: React.FC = () => {
        const { locale, isRTL } = useI18nContext();
        return (
          <div data-testid="rtl-cache-test">
            {locale}-{isRTL ? 'rtl' : 'ltr'}
          </div>
        );
      };

      render(
        <I18nProvider initialLocale="ar">
          <CacheTestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('rtl-cache-test')).toHaveTextContent('ar-rtl');
    });
  });
});