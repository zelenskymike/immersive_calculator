/**
 * I18nProvider Component
 * Provides internationalization context and MUI theme integration
 * Handles language switching, RTL layout, and cultural formatting
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import { CssBaseline } from '@mui/material';

import { useI18n } from './useI18n';
import type { Locale } from './useI18n';

export interface I18nContextValue {
  // Translation function
  t: (key: string, params?: Record<string, string | number>) => string;
  
  // Current locale
  locale: Locale;
  setLocale: (locale: Locale) => void;
  
  // Direction and layout
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
  
  // Formatting functions
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
  formatPercentage: (value: number) => string;
  formatLargeNumber: (value: number) => string;
  
  // Locale utilities
  availableLocales: Locale[];
  getLocaleDisplayName: (locale: Locale) => string;
  
  // Validation helpers
  getValidationMessage: (errorType: string, fieldName?: string, params?: Record<string, string | number>) => string;
  
  // URL helpers
  localizeUrl: (path: string) => string;
  delocalizeUrl: (localizedPath: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  /** Initial locale override */
  initialLocale?: Locale;
}

/**
 * I18n Provider Component
 * Wraps the application with internationalization context and theming
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ 
  children,
  initialLocale 
}) => {
  const i18nHookValue = useI18n();
  
  // Apply initial locale if provided
  React.useEffect(() => {
    if (initialLocale && initialLocale !== i18nHookValue.locale) {
      i18nHookValue.setLocale(initialLocale);
    }
  }, [initialLocale, i18nHookValue.locale, i18nHookValue.setLocale]);

  // Context value that excludes MUI-specific properties
  const contextValue: I18nContextValue = {
    t: i18nHookValue.t,
    locale: i18nHookValue.locale,
    setLocale: i18nHookValue.setLocale,
    direction: i18nHookValue.direction,
    isRTL: i18nHookValue.isRTL,
    formatNumber: i18nHookValue.formatNumber,
    formatCurrency: i18nHookValue.formatCurrency,
    formatDate: i18nHookValue.formatDate,
    formatRelativeTime: i18nHookValue.formatRelativeTime,
    formatPercentage: i18nHookValue.formatPercentage,
    formatLargeNumber: i18nHookValue.formatLargeNumber,
    availableLocales: i18nHookValue.availableLocales,
    getLocaleDisplayName: i18nHookValue.getLocaleDisplayName,
    getValidationMessage: i18nHookValue.getValidationMessage,
    localizeUrl: i18nHookValue.localizeUrl,
    delocalizeUrl: i18nHookValue.delocalizeUrl,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      <CacheProvider value={i18nHookValue.emotionCache}>
        <ThemeProvider theme={i18nHookValue.theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </CacheProvider>
    </I18nContext.Provider>
  );
};

/**
 * Hook to access I18n context
 * Throws error if used outside I18nProvider
 */
export const useI18nContext = (): I18nContextValue => {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error(
      'useI18nContext must be used within an I18nProvider. ' +
      'Make sure you have wrapped your component tree with <I18nProvider>.'
    );
  }
  
  return context;
};

/**
 * Higher-order component for easy I18n integration
 * Provides both context and MUI theming
 */
export const withI18nProvider = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & { initialLocale?: Locale }> => {
  return ({ initialLocale, ...props }) => (
    <I18nProvider initialLocale={initialLocale}>
      <Component {...(props as P)} />
    </I18nProvider>
  );
};

export default I18nProvider;