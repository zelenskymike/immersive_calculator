/**
 * Internationalization hook with comprehensive language support
 * Provides translation, RTL layout, and cultural formatting functionality
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createTheme, Theme, ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

// Import translations
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';

// Supported locales
export type Locale = 'en' | 'ar';
export type TranslationKey = keyof typeof enTranslations;

// Translation data structure
const translations = {
  en: enTranslations,
  ar: arTranslations,
} as const;

// Direction mapping
const DIRECTION_MAP: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
};

// Regional number formatting
const NUMBER_FORMATS: Record<Locale, Intl.NumberFormatOptions> = {
  en: {
    numberingSystem: 'latn',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  ar: {
    numberingSystem: 'arab',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
};

// Regional date formatting
const DATE_FORMATS: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
  ar: {
    dateStyle: 'medium',
    timeStyle: 'short',
    calendar: 'gregory',
  },
};

// Currency display options
const CURRENCY_FORMATS: Record<Locale, Intl.NumberFormatOptions> = {
  en: {
    style: 'currency',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
  ar: {
    style: 'currency',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
};

// Browser locale detection
const detectBrowserLocale = (): Locale => {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  
  // Check for Arabic
  if (browserLang.startsWith('ar')) {
    return 'ar';
  }
  
  // Default to English
  return 'en';
};

// Local storage key for persisting locale preference
const LOCALE_STORAGE_KEY = 'tco-calculator-locale';

// RTL cache for emotion
const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const ltrCache = createCache({
  key: 'muiltr',
});

/**
 * Translation function with interpolation support
 */
const translateText = (
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string => {
  const keys = key.split('.');
  let translation: any = translations[locale];
  
  // Navigate through nested keys
  for (const k of keys) {
    if (translation && typeof translation === 'object' && k in translation) {
      translation = translation[k];
    } else {
      // Fallback to English if key not found
      translation = translations.en;
      for (const fallbackKey of keys) {
        if (translation && typeof translation === 'object' && fallbackKey in translation) {
          translation = translation[fallbackKey];
        } else {
          return key; // Return key if not found in fallback
        }
      }
      break;
    }
  }
  
  if (typeof translation !== 'string') {
    return key; // Return key if translation is not a string
  }
  
  // Interpolate parameters
  if (params) {
    return Object.entries(params).reduce((text, [param, value]) => {
      return text.replace(new RegExp(`{${param}}`, 'g'), String(value));
    }, translation);
  }
  
  return translation;
};

/**
 * Custom hook for internationalization
 */
export const useI18n = () => {
  // Initialize locale from localStorage or browser detection
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale;
    if (stored && Object.keys(translations).includes(stored)) {
      return stored;
    }
    return detectBrowserLocale();
  });

  // Persist locale changes
  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    
    // Update document direction and lang
    document.documentElement.dir = DIRECTION_MAP[locale];
    document.documentElement.lang = locale;
    
    // Update page title with localized content
    const title = translateText(locale, 'meta.title');
    if (title !== 'meta.title') {
      document.title = title;
    }
    
    // Update meta description
    const description = translateText(locale, 'meta.description');
    if (description !== 'meta.description') {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
  }, [locale]);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    return translateText(locale, key, params);
  }, [locale]);

  // Locale switching function
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  // Direction helper
  const direction = useMemo(() => DIRECTION_MAP[locale], [locale]);
  const isRTL = useMemo(() => direction === 'rtl', [direction]);

  // Number formatting
  const formatNumber = useCallback((
    value: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    const formatOptions = { ...NUMBER_FORMATS[locale], ...options };
    return new Intl.NumberFormat(locale, formatOptions).format(value);
  }, [locale]);

  // Currency formatting
  const formatCurrency = useCallback((
    value: number,
    currency: string = 'USD',
    options?: Intl.NumberFormatOptions
  ): string => {
    const formatOptions = { 
      ...CURRENCY_FORMATS[locale], 
      currency,
      ...options 
    };
    return new Intl.NumberFormat(locale, formatOptions).format(value);
  }, [locale]);

  // Date formatting
  const formatDate = useCallback((
    date: Date,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const formatOptions = { ...DATE_FORMATS[locale], ...options };
    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
  }, [locale]);

  // Relative time formatting
  const formatRelativeTime = useCallback((
    value: number,
    unit: Intl.RelativeTimeFormatUnit
  ): string => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return rtf.format(value, unit);
  }, [locale]);

  // Percentage formatting
  const formatPercentage = useCallback((value: number): string => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  }, [locale]);

  // Large number formatting (K, M, B)
  const formatLargeNumber = useCallback((value: number): string => {
    const formatters = [
      { value: 1e9, suffix: isRTL ? 'ب' : 'B' },
      { value: 1e6, suffix: isRTL ? 'م' : 'M' },
      { value: 1e3, suffix: isRTL ? 'ك' : 'K' },
    ];

    for (const formatter of formatters) {
      if (Math.abs(value) >= formatter.value) {
        const formatted = formatNumber(value / formatter.value, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
        return `${formatted}${formatter.suffix}`;
      }
    }

    return formatNumber(value);
  }, [formatNumber, isRTL]);

  // MUI theme with RTL support
  const theme = useMemo((): Theme => {
    const baseTheme = createTheme({
      direction,
      typography: {
        fontFamily: locale === 'ar' 
          ? '"Noto Sans Arabic", "Cairo", "Amiri", sans-serif'
          : '"Roboto", "Helvetica", "Arial", sans-serif',
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              direction,
            },
          },
        },
        MuiTextField: {
          defaultProps: {
            variant: 'outlined',
            fullWidth: true,
            InputLabelProps: {
              shrink: undefined, // Let MUI handle this automatically
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none', // Preserve original text casing for Arabic
            },
          },
        },
        MuiTypography: {
          styleOverrides: {
            root: {
              // Ensure proper text alignment for RTL
              textAlign: isRTL ? 'right' : 'left',
            },
          },
        },
        MuiTooltip: {
          defaultProps: {
            placement: isRTL ? 'bottom-end' : 'bottom-start',
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              direction,
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              direction,
            },
          },
        },
      },
      palette: {
        mode: 'light',
        primary: {
          main: '#1976d2',
          light: '#42a5f5',
          dark: '#1565c0',
        },
        secondary: {
          main: '#2e7d32',
          light: '#4caf50',
          dark: '#1b5e20',
        },
        success: {
          main: '#2e7d32',
        },
        warning: {
          main: '#ed6c02',
        },
        error: {
          main: '#d32f2f',
        },
      },
    });

    return baseTheme;
  }, [direction, isRTL, locale]);

  // Emotion cache for RTL/LTR
  const emotionCache = useMemo(() => {
    return isRTL ? rtlCache : ltrCache;
  }, [isRTL]);

  // Available locales
  const availableLocales = useMemo(() => Object.keys(translations) as Locale[], []);

  // Get locale display name
  const getLocaleDisplayName = useCallback((localeCode: Locale): string => {
    const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
    return displayNames.of(localeCode) || localeCode;
  }, [locale]);

  // Validation message helper
  const getValidationMessage = useCallback((
    errorType: string,
    fieldName?: string,
    params?: Record<string, string | number>
  ): string => {
    const key = `errors.validation.${errorType}`;
    let message = t(key, params);
    
    if (fieldName && message.includes('{field}')) {
      message = message.replace('{field}', t(fieldName));
    }
    
    return message;
  }, [t]);

  // URL localization helpers
  const localizeUrl = useCallback((path: string): string => {
    if (locale === 'en') return path;
    return `/${locale}${path}`;
  }, [locale]);

  const delocalizeUrl = useCallback((localizedPath: string): string => {
    if (locale === 'en') return localizedPath;
    return localizedPath.replace(new RegExp(`^/${locale}`), '');
  }, [locale]);

  return {
    // Core functions
    t,
    locale,
    setLocale,
    
    // Direction and layout
    direction,
    isRTL,
    
    // Formatting functions
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
    formatPercentage,
    formatLargeNumber,
    
    // MUI integration
    theme,
    emotionCache,
    
    // Locale utilities
    availableLocales,
    getLocaleDisplayName,
    
    // Validation helpers
    getValidationMessage,
    
    // URL helpers
    localizeUrl,
    delocalizeUrl,
  };
};

/**
 * Higher-order component for providing i18n context
 */
export const withI18n = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    const { theme, emotionCache } = useI18n();
    
    return (
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <Component {...props} />
        </ThemeProvider>
      </CacheProvider>
    );
  };
};

/**
 * Currency utilities with locale awareness
 */
export const CurrencyLocalization = {
  // Get currency symbol for a given currency code
  getSymbol: (currencyCode: string, locale: Locale = 'en'): string => {
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      
      // Extract symbol from formatted number
      const parts = formatter.formatToParts(0);
      const symbolPart = parts.find(part => part.type === 'currency');
      return symbolPart?.value || currencyCode;
    } catch {
      return currencyCode;
    }
  },
  
  // Check if currency uses prefix or suffix
  isPrefix: (currencyCode: string, locale: Locale = 'en'): boolean => {
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
      });
      
      const parts = formatter.formatToParts(100);
      const currencyIndex = parts.findIndex(part => part.type === 'currency');
      const integerIndex = parts.findIndex(part => part.type === 'integer');
      
      return currencyIndex < integerIndex;
    } catch {
      return true; // Default to prefix
    }
  },
  
  // Format currency with proper locale
  format: (
    amount: number,
    currencyCode: string,
    locale: Locale = 'en',
    options?: Intl.NumberFormatOptions
  ): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...options,
      }).format(amount);
    } catch {
      // Fallback formatting
      const symbol = CurrencyLocalization.getSymbol(currencyCode, locale);
      const isPrefix = CurrencyLocalization.isPrefix(currencyCode, locale);
      const formattedNumber = amount.toLocaleString(locale);
      
      return isPrefix ? `${symbol}${formattedNumber}` : `${formattedNumber} ${symbol}`;
    }
  },
};

export default useI18n;