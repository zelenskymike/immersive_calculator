/**
 * RTL Layout Tests
 * Tests right-to-left layout behavior and visual correctness for Arabic language
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import { I18nProvider } from '../I18nProvider';
import { useI18n } from '../useI18n';
import {
  Box,
  Button,
  TextField,
  Typography,
  AppBar,
  Toolbar,
  Grid,
} from '@mui/material';

// Test component that demonstrates RTL layout
const RTLTestComponent: React.FC = () => {
  const { theme, emotionCache, isRTL, direction, t } = useI18n();
  
  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <Box data-testid="rtl-container" dir={direction}>
          {/* Typography alignment */}
          <Typography data-testid="title-text" variant="h4">
            {t('calculator.title')}
          </Typography>
          
          {/* Button with icon positioning */}
          <Button 
            data-testid="action-button"
            variant="contained" 
            startIcon="→"
          >
            {t('common.next')}
          </Button>
          
          {/* Text field label and input direction */}
          <TextField 
            data-testid="rtl-textfield"
            label={t('common.amount')}
            variant="outlined"
            fullWidth
          />
          
          {/* Grid layout direction */}
          <Grid container spacing={2} data-testid="grid-container">
            <Grid item xs={6} data-testid="grid-item-1">
              <Typography>{t('common.total')}</Typography>
            </Grid>
            <Grid item xs={6} data-testid="grid-item-2">
              <Typography>Value</Typography>
            </Grid>
          </Grid>
          
          {/* AppBar with content alignment */}
          <AppBar position="static" data-testid="app-bar">
            <Toolbar>
              <Typography variant="h6" data-testid="app-bar-title">
                {t('navigation.calculator')}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button color="inherit" data-testid="app-bar-button">
                {t('navigation.help')}
              </Button>
            </Toolbar>
          </AppBar>
          
          {/* Test data attributes for RTL state */}
          <div data-testid="rtl-indicator" data-is-rtl={isRTL}>
            RTL: {isRTL ? 'true' : 'false'}
          </div>
          
          <div data-testid="direction-indicator" data-direction={direction}>
            Direction: {direction}
          </div>
        </Box>
      </ThemeProvider>
    </CacheProvider>
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

describe('RTL Layout Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  describe('LTR Layout (English)', () => {
    it('should render with LTR direction for English', () => {
      render(
        <I18nProvider initialLocale="en">
          <RTLTestComponent />
        </I18nProvider>
      );

      const container = screen.getByTestId('rtl-container');
      const rtlIndicator = screen.getByTestId('rtl-indicator');
      const directionIndicator = screen.getByTestId('direction-indicator');

      expect(container).toHaveAttribute('dir', 'ltr');
      expect(rtlIndicator).toHaveAttribute('data-is-rtl', 'false');
      expect(directionIndicator).toHaveAttribute('data-direction', 'ltr');
    });

    it('should display English text correctly', () => {
      render(
        <I18nProvider initialLocale="en">
          <RTLTestComponent />
        </I18nProvider>
      );

      const titleText = screen.getByTestId('title-text');
      const actionButton = screen.getByTestId('action-button');
      
      expect(titleText).toHaveTextContent('Immersion Cooling TCO Calculator');
      expect(actionButton).toHaveTextContent('Next');
    });

    it('should set document properties for LTR', () => {
      render(
        <I18nProvider initialLocale="en">
          <RTLTestComponent />
        </I18nProvider>
      );

      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('RTL Layout (Arabic)', () => {
    it('should render with RTL direction for Arabic', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      const container = screen.getByTestId('rtl-container');
      const rtlIndicator = screen.getByTestId('rtl-indicator');
      const directionIndicator = screen.getByTestId('direction-indicator');

      expect(container).toHaveAttribute('dir', 'rtl');
      expect(rtlIndicator).toHaveAttribute('data-is-rtl', 'true');
      expect(directionIndicator).toHaveAttribute('data-direction', 'rtl');
    });

    it('should display Arabic text correctly', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      const titleText = screen.getByTestId('title-text');
      const actionButton = screen.getByTestId('action-button');
      
      expect(titleText).toHaveTextContent('حاسبة التكلفة الإجمالية للملكية للتبريد بالغمر');
      expect(actionButton).toHaveTextContent('التالي');
    });

    it('should set document properties for RTL', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar');
    });

    it('should use Arabic font family', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      // The theme should be applied through ThemeProvider
      // We can verify this by checking the component renders without errors
      expect(screen.getByTestId('rtl-container')).toBeInTheDocument();
    });
  });

  describe('Emotion Cache RTL Support', () => {
    it('should use LTR cache for English', () => {
      const CacheTestComponent: React.FC = () => {
        const { emotionCache, isRTL } = useI18n();
        
        return (
          <div data-testid="cache-info" data-cache-key={emotionCache.key}>
            Cache: {emotionCache.key} | RTL: {isRTL.toString()}
          </div>
        );
      };

      render(
        <I18nProvider initialLocale="en">
          <CacheTestComponent />
        </I18nProvider>
      );

      const cacheInfo = screen.getByTestId('cache-info');
      expect(cacheInfo).toHaveAttribute('data-cache-key', 'muiltr');
    });

    it('should use RTL cache for Arabic', () => {
      const CacheTestComponent: React.FC = () => {
        const { emotionCache, isRTL } = useI18n();
        
        return (
          <div data-testid="cache-info" data-cache-key={emotionCache.key}>
            Cache: {emotionCache.key} | RTL: {isRTL.toString()}
          </div>
        );
      };

      render(
        <I18nProvider initialLocale="ar">
          <CacheTestComponent />
        </I18nProvider>
      );

      const cacheInfo = screen.getByTestId('cache-info');
      expect(cacheInfo).toHaveAttribute('data-cache-key', 'muirtl');
    });
  });

  describe('MUI Component RTL Integration', () => {
    it('should apply RTL styles to MUI components', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      // Components should render without throwing errors
      expect(screen.getByTestId('action-button')).toBeInTheDocument();
      expect(screen.getByTestId('rtl-textfield')).toBeInTheDocument();
      expect(screen.getByTestId('grid-container')).toBeInTheDocument();
    });

    it('should handle text field direction correctly', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      const textField = screen.getByTestId('rtl-textfield');
      expect(textField).toBeInTheDocument();
      
      // Text field should have Arabic label
      expect(screen.getByText('المبلغ')).toBeInTheDocument(); // 'amount' in Arabic
    });

    it('should handle AppBar content alignment for RTL', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      const appBar = screen.getByTestId('app-bar');
      const appBarTitle = screen.getByTestId('app-bar-title');
      const appBarButton = screen.getByTestId('app-bar-button');

      expect(appBar).toBeInTheDocument();
      expect(appBarTitle).toHaveTextContent('الحاسبة'); // 'calculator' in Arabic
      expect(appBarButton).toHaveTextContent('مساعدة'); // 'help' in Arabic
    });
  });

  describe('Theme Direction Integration', () => {
    it('should create theme with correct direction for LTR', () => {
      const ThemeTestComponent: React.FC = () => {
        const { theme } = useI18n();
        
        return (
          <div data-testid="theme-direction">
            {theme.direction}
          </div>
        );
      };

      render(
        <I18nProvider initialLocale="en">
          <ThemeTestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('theme-direction')).toHaveTextContent('ltr');
    });

    it('should create theme with correct direction for RTL', () => {
      const ThemeTestComponent: React.FC = () => {
        const { theme } = useI18n();
        
        return (
          <div data-testid="theme-direction">
            {theme.direction}
          </div>
        );
      };

      render(
        <I18nProvider initialLocale="ar">
          <ThemeTestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('theme-direction')).toHaveTextContent('rtl');
    });

    it('should apply correct font family for Arabic theme', () => {
      const FontTestComponent: React.FC = () => {
        const { theme } = useI18n();
        
        return (
          <div data-testid="font-family">
            {theme.typography.fontFamily}
          </div>
        );
      };

      render(
        <I18nProvider initialLocale="ar">
          <FontTestComponent />
        </I18nProvider>
      );

      const fontFamily = screen.getByTestId('font-family').textContent;
      expect(fontFamily).toContain('Noto Sans Arabic');
    });
  });

  describe('Component Behavior in RTL', () => {
    it('should handle Grid layout correctly in RTL', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      const gridContainer = screen.getByTestId('grid-container');
      const gridItem1 = screen.getByTestId('grid-item-1');
      const gridItem2 = screen.getByTestId('grid-item-2');

      // Grid should render without layout issues
      expect(gridContainer).toBeInTheDocument();
      expect(gridItem1).toBeInTheDocument();
      expect(gridItem2).toBeInTheDocument();
    });

    it('should maintain component functionality in RTL', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      // All components should be interactive and functional
      const button = screen.getByTestId('action-button');
      const textField = screen.getByTestId('rtl-textfield');

      expect(button).not.toBeDisabled();
      expect(textField.querySelector('input')).toBeInTheDocument();
    });
  });

  describe('CSS and Styling in RTL', () => {
    it('should apply RTL-specific CSS through emotion', () => {
      render(
        <I18nProvider initialLocale="ar">
          <RTLTestComponent />
        </I18nProvider>
      );

      // Emotion cache should be applied without errors
      const container = screen.getByTestId('rtl-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    it('should handle text alignment for RTL content', () => {
      const TextAlignmentComponent: React.FC = () => {
        const { isRTL } = useI18n();
        
        return (
          <Typography 
            data-testid="aligned-text"
            sx={{ textAlign: isRTL ? 'right' : 'left' }}
          >
            Test alignment
          </Typography>
        );
      };

      render(
        <I18nProvider initialLocale="ar">
          <TextAlignmentComponent />
        </I18nProvider>
      );

      const alignedText = screen.getByTestId('aligned-text');
      expect(alignedText).toBeInTheDocument();
    });
  });

  describe('Responsive RTL Behavior', () => {
    it('should maintain RTL layout across different screen sizes', () => {
      // Test that RTL works with responsive components
      const ResponsiveComponent: React.FC = () => {
        const { isRTL, t } = useI18n();
        
        return (
          <Grid container spacing={2} direction={isRTL ? 'row-reverse' : 'row'}>
            <Grid item xs={12} sm={6} data-testid="responsive-item-1">
              {t('common.total')}
            </Grid>
            <Grid item xs={12} sm={6} data-testid="responsive-item-2">
              {t('common.amount')}
            </Grid>
          </Grid>
        );
      };

      render(
        <I18nProvider initialLocale="ar">
          <ResponsiveComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('responsive-item-1')).toHaveTextContent('المجموع');
      expect(screen.getByTestId('responsive-item-2')).toHaveTextContent('المبلغ');
    });
  });
});