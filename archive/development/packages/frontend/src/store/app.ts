/**
 * Main application store using Zustand
 * Manages global application state including theme, language, currency, and user preferences
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Currency, Locale } from '@tco-calculator/shared';

// Types
export interface AppState {
  // Initialization
  isInitialized: boolean;
  
  // User Preferences
  theme: 'light' | 'dark' | 'auto';
  language: Locale;
  currency: Currency;
  locale: string;
  
  // UI State
  sidebarOpen: boolean;
  loading: boolean;
  notifications: Notification[];
  
  // Feature Flags
  features: {
    darkMode: boolean;
    offlineMode: boolean;
    advancedMode: boolean;
    debugMode: boolean;
  };
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoHide?: boolean;
  duration?: number;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

export interface AppActions {
  // Initialization
  initialize: () => void;
  
  // Theme and Appearance
  setTheme: (theme: AppState['theme']) => void;
  setLanguage: (language: Locale) => void;
  setCurrency: (currency: Currency) => void;
  
  // UI Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Feature Flags
  toggleFeature: (feature: keyof AppState['features']) => void;
  setFeature: (feature: keyof AppState['features'], enabled: boolean) => void;
  
  // Utility
  reset: () => void;
}

type AppStore = AppState & AppActions;

// Default state
const defaultState: AppState = {
  isInitialized: false,
  theme: 'light',
  language: 'en',
  currency: 'USD',
  locale: 'en-US',
  sidebarOpen: false,
  loading: false,
  notifications: [],
  features: {
    darkMode: true,
    offlineMode: false,
    advancedMode: false,
    debugMode: import.meta.env.DEV,
  },
};

// Detect user preferences
const detectUserPreferences = (): Partial<AppState> => {
  const preferences: Partial<AppState> = {};
  
  // Detect language from browser
  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith('ar')) {
    preferences.language = 'ar';
    preferences.locale = 'ar-SA';
  } else {
    preferences.language = 'en';
    preferences.locale = 'en-US';
  }
  
  // Detect currency from location (basic heuristic)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone.includes('Europe')) {
    preferences.currency = 'EUR';
    if (preferences.language === 'en') {
      preferences.locale = 'en-GB';
    }
  } else if (timeZone.includes('Dubai') || timeZone.includes('Riyadh')) {
    if (timeZone.includes('Dubai')) {
      preferences.currency = 'AED';
    } else {
      preferences.currency = 'SAR';
    }
  } else {
    preferences.currency = 'USD';
  }
  
  // Detect theme preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    preferences.theme = 'dark';
  } else {
    preferences.theme = 'light';
  }
  
  return preferences;
};

// Create the store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...defaultState,
          
          // Initialization
          initialize: () => {
            set((state) => {
              if (state.isInitialized) return;
              
              // Apply detected user preferences if not already set
              const preferences = detectUserPreferences();
              Object.assign(state, preferences);
              
              state.isInitialized = true;
            });
          },
          
          // Theme and Appearance
          setTheme: (theme) => {
            set((state) => {
              state.theme = theme;
            });
          },
          
          setLanguage: (language) => {
            set((state) => {
              state.language = language;
              // Update locale accordingly
              if (language === 'ar') {
                state.locale = state.currency === 'SAR' ? 'ar-SA' : 'ar-AE';
              } else {
                state.locale = state.currency === 'EUR' ? 'en-GB' : 'en-US';
              }
            });
          },
          
          setCurrency: (currency) => {
            set((state) => {
              state.currency = currency;
              // Update locale accordingly
              if (state.language === 'ar') {
                state.locale = currency === 'SAR' ? 'ar-SA' : 'ar-AE';
              } else {
                state.locale = currency === 'EUR' ? 'en-GB' : 'en-US';
              }
            });
          },
          
          // UI Actions
          setSidebarOpen: (open) => {
            set((state) => {
              state.sidebarOpen = open;
            });
          },
          
          toggleSidebar: () => {
            set((state) => {
              state.sidebarOpen = !state.sidebarOpen;
            });
          },
          
          setLoading: (loading) => {
            set((state) => {
              state.loading = loading;
            });
          },
          
          // Notifications
          addNotification: (notification) => {
            set((state) => {
              const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const newNotification: Notification = {
                id,
                autoHide: true,
                duration: 5000,
                ...notification,
              };
              
              state.notifications.push(newNotification);
              
              // Auto-remove after duration
              if (newNotification.autoHide) {
                setTimeout(() => {
                  const currentState = get();
                  if (currentState.notifications.find(n => n.id === id)) {
                    currentState.removeNotification(id);
                  }
                }, newNotification.duration);
              }
            });
          },
          
          removeNotification: (id) => {
            set((state) => {
              const index = state.notifications.findIndex(n => n.id === id);
              if (index >= 0) {
                state.notifications.splice(index, 1);
              }
            });
          },
          
          clearNotifications: () => {
            set((state) => {
              state.notifications = [];
            });
          },
          
          // Feature Flags
          toggleFeature: (feature) => {
            set((state) => {
              state.features[feature] = !state.features[feature];
            });
          },
          
          setFeature: (feature, enabled) => {
            set((state) => {
              state.features[feature] = enabled;
            });
          },
          
          // Utility
          reset: () => {
            set(defaultState);
          },
        }))
      ),
      {
        name: 'tco-calculator-app-store',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          currency: state.currency,
          locale: state.locale,
          features: state.features,
        }),
        version: 1,
        migrate: (persistedState: any, version) => {
          // Handle store migrations here if schema changes
          if (version === 0) {
            // Migration from version 0 to 1
            return {
              ...persistedState,
              features: {
                ...defaultState.features,
                ...persistedState.features,
              },
            };
          }
          return persistedState;
        },
      }
    ),
    {
      name: 'TCO Calculator App Store',
      enabled: import.meta.env.DEV,
    }
  )
);

// Selectors for better performance
export const useTheme = () => useAppStore((state) => state.theme);
export const useLanguage = () => useAppStore((state) => state.language);
export const useCurrency = () => useAppStore((state) => state.currency);
export const useLocale = () => useAppStore((state) => state.locale);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useFeatures = () => useAppStore((state) => state.features);
export const useLoading = () => useAppStore((state) => state.loading);

// Theme change subscription
if (typeof window !== 'undefined') {
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    const store = useAppStore.getState();
    if (store.theme === 'auto') {
      // Trigger re-render when system theme changes and user has auto theme
      store.setTheme('auto');
    }
  });
  
  // Listen for language changes
  window.addEventListener('languagechange', () => {
    const preferences = detectUserPreferences();
    const store = useAppStore.getState();
    if (preferences.language && preferences.language !== store.language) {
      store.setLanguage(preferences.language);
    }
  });
}