import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { I18nProvider } from './i18n/I18nProvider';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import './index.css';

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Error reporting setup
const reportError = (error: Error, errorInfo?: React.ErrorInfo) => {
  console.error('Application Error:', error, errorInfo);
  
  // In production, send to error reporting service
  if (import.meta.env.PROD && import.meta.env.VITE_ERROR_REPORTING_URL) {
    fetch(import.meta.env.VITE_ERROR_REPORTING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        errorInfo,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }),
    }).catch(reportingError => {
      console.error('Failed to report error:', reportingError);
    });
  }
};

// Root component with all providers
const AppWithProviders: React.FC = () => {
  return (
    <React.StrictMode>
      <ErrorBoundary onError={reportError}>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <I18nProvider>
                <ThemeProvider>
                  <App />
                </ThemeProvider>
              </I18nProvider>
            </BrowserRouter>
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </QueryClientProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Render application
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<AppWithProviders />);

// Hot Module Replacement (HMR) - only in development
if (import.meta.hot) {
  import.meta.hot.accept('./App', () => {
    root.render(<AppWithProviders />);
  });
}

// Performance monitoring
if (import.meta.env.DEV) {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}