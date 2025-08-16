import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Box, Container, Fade } from '@mui/material';

// Layout components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load page components for better performance
const Calculator = React.lazy(() => import('./pages/Calculator'));
const Results = React.lazy(() => import('./pages/Results'));
const SharedCalculation = React.lazy(() => import('./pages/SharedCalculation'));
const About = React.lazy(() => import('./pages/About'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Hooks and store
import { useAppStore } from './store/app';
import { useI18n } from './i18n/useI18n';

// Types
interface AppProps {}

const App: React.FC<AppProps> = () => {
  const { t, locale, isRTL } = useI18n();
  const { 
    isInitialized, 
    initialize
  } = useAppStore();

  // Initialize application on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [isRTL, locale]);

  // Show loading spinner during app initialization
  if (!isInitialized) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: 'background.default'
        }}
      >
        <LoadingSpinner size="large" />
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Helmet>
        <title>{t('app.title')}</title>
        <meta name="description" content={t('app.description')} />
        <meta name="language" content={locale} />
        <meta name="locale" content={locale} />
        <link rel="canonical" href={window.location.origin} />
        
        {/* JSON-LD structured data for SEO */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": t('app.title'),
            "description": t('app.description'),
            "url": window.location.origin,
            "applicationCategory": "FinancialApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "TCO Calculation",
              "Cost Comparison",
              "Financial Analysis",
              "Report Generation",
              "Multi-language Support",
              "Multi-currency Support"
            ]
          })}
        </script>
      </Helmet>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: 'background.default'
        }}
      >
        {/* Application Header */}
        <Header />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Suspense 
            fallback={
              <Container 
                maxWidth="lg" 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  minHeight: '400px'
                }}
              >
                <LoadingSpinner size="large" />
              </Container>
            }
          >
            <Fade in timeout={300}>
              <Box>
                <Routes>
                  {/* Main Calculator Route */}
                  <Route 
                    path="/" 
                    element={<Calculator />} 
                  />
                  
                  {/* Calculator Results */}
                  <Route 
                    path="/results/:sessionId" 
                    element={<Results />} 
                  />
                  
                  {/* Shared Calculation View */}
                  <Route 
                    path="/share/:shareToken" 
                    element={<SharedCalculation />} 
                  />
                  
                  {/* About Page */}
                  <Route 
                    path="/about" 
                    element={<About />} 
                  />
                  
                  {/* Legacy routes - redirect to main calculator */}
                  <Route 
                    path="/calculator" 
                    element={<Navigate to="/" replace />} 
                  />
                  
                  <Route 
                    path="/calc" 
                    element={<Navigate to="/" replace />} 
                  />
                  
                  {/* 404 Not Found */}
                  <Route 
                    path="*" 
                    element={<NotFound />} 
                  />
                </Routes>
              </Box>
            </Fade>
          </Suspense>
        </Box>

        {/* Application Footer */}
        <Footer />
      </Box>

      {/* Global modals, toasts, and overlays would go here */}
      {/* These could be managed by the app store */}
      
      {/* Development tools */}
      {import.meta.env.DEV && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 9999,
            opacity: 0.5,
            fontSize: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}
        >
          v{__APP_VERSION__} • {import.meta.env.MODE} • {locale.toUpperCase()}
        </Box>
      )}
    </ErrorBoundary>
  );
};

export default App;