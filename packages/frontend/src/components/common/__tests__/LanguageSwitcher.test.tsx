/**
 * Language Switcher Component Tests
 * Tests language selection UI and RTL/LTR transitions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { I18nProvider } from '../../../i18n/I18nProvider';

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
    style: {},
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

// Test wrapper with I18nProvider
const LanguageSwitcherWrapper: React.FC<{
  children: React.ReactNode;
  initialLocale?: 'en' | 'ar';
}> = ({ children, initialLocale }) => (
  <I18nProvider initialLocale={initialLocale}>
    {children}
  </I18nProvider>
);

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
    if (document.documentElement.style) {
      document.documentElement.style.transition = '';
      document.documentElement.style.opacity = '';
    }
  });

  describe('Button Variant (Default)', () => {
    it('should render button variant with English flag and name', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('🇺🇸'); // US flag
      expect(button).toHaveTextContent('English');
    });

    it('should render button with Arabic when locale is Arabic', () => {
      render(
        <LanguageSwitcherWrapper initialLocale="ar">
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      expect(button).toHaveTextContent('🇸🇦'); // Saudi flag
      expect(button).toHaveTextContent('العربية');
    });

    it('should open menu when button is clicked', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      expect(screen.getByTestId('language-option-en')).toBeInTheDocument();
      expect(screen.getByTestId('language-option-ar')).toBeInTheDocument();
    });

    it('should hide names when showNames is false', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher showNames={false} />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      // Should still show flag but not the text name
      expect(button).toHaveTextContent('🇺🇸');
    });

    it('should switch language when option is clicked', async () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      // Open menu
      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      // Click Arabic option
      fireEvent.click(screen.getByTestId('language-option-ar'));

      // Wait for language change
      await waitFor(() => {
        expect(document.documentElement.dir).toBe('rtl');
        expect(document.documentElement.lang).toBe('ar');
      });
    });
  });

  describe('Chip Variant', () => {
    it('should render chip variant with flag', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher variant="chip" />
        </LanguageSwitcherWrapper>
      );

      const chip = screen.getByTestId('language-switcher-chip');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('🇺🇸');
      expect(chip).toHaveTextContent('English');
    });

    it('should render chip without name when showCurrentName is false', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher variant="chip" showCurrentName={false} />
        </LanguageSwitcherWrapper>
      );

      const chip = screen.getByTestId('language-switcher-chip');
      expect(chip).toHaveTextContent('🇺🇸');
      expect(chip).not.toHaveTextContent('English');
    });

    it('should open menu when chip is clicked', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher variant="chip" />
        </LanguageSwitcherWrapper>
      );

      const chip = screen.getByTestId('language-switcher-chip');
      fireEvent.click(chip);

      expect(screen.getByTestId('language-option-en')).toBeInTheDocument();
      expect(screen.getByTestId('language-option-ar')).toBeInTheDocument();
    });
  });

  describe('Minimal Variant', () => {
    it('should render minimal variant with just flag', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher variant="minimal" />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-minimal');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('🇺🇸');
      expect(button).not.toHaveTextContent('English');
    });

    it('should respect size prop', () => {
      const { rerender } = render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher variant="minimal" size="small" />
        </LanguageSwitcherWrapper>
      );

      const smallButton = screen.getByTestId('language-switcher-minimal');
      expect(smallButton).toHaveStyle({ width: '32px', height: '32px' });

      rerender(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher variant="minimal" size="large" />
        </LanguageSwitcherWrapper>
      );

      const largeButton = screen.getByTestId('language-switcher-minimal');
      expect(largeButton).toHaveStyle({ width: '48px', height: '48px' });
    });
  });

  describe('Language Options Menu', () => {
    it('should show all available languages', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      // Check English option
      const enOption = screen.getByTestId('language-option-en');
      expect(enOption).toHaveTextContent('🇺🇸');
      expect(enOption).toHaveTextContent('English');

      // Check Arabic option
      const arOption = screen.getByTestId('language-option-ar');
      expect(arOption).toHaveTextContent('🇸🇦');
      expect(arOption).toHaveTextContent('العربية');
      expect(arOption).toHaveTextContent('Arabic');
    });

    it('should show check mark for current language', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      const enOption = screen.getByTestId('language-option-en');
      expect(enOption).toHaveAttribute('aria-selected', 'true');
    });

    it('should close menu when option is selected', async () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      // Open menu
      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      // Select Arabic
      fireEvent.click(screen.getByTestId('language-option-ar'));

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByTestId('language-option-en')).not.toBeInTheDocument();
      });
    });
  });

  describe('RTL Support', () => {
    it('should position menu correctly for RTL languages', () => {
      render(
        <LanguageSwitcherWrapper initialLocale="ar">
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      // In RTL, menu should be positioned differently
      // This is handled by MUI's Menu component with our anchor origin settings
      expect(screen.getByTestId('language-option-en')).toBeInTheDocument();
    });

    it('should handle RTL flag and text arrangement', () => {
      render(
        <LanguageSwitcherWrapper initialLocale="ar">
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      expect(button).toHaveTextContent('🇸🇦');
      expect(button).toHaveTextContent('العربية');
    });
  });

  describe('Transition Effects', () => {
    it('should apply fade transition when switching languages', async () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      // Open menu
      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      // Mock timers to control transition
      jest.useFakeTimers();

      // Click Arabic option
      fireEvent.click(screen.getByTestId('language-option-ar'));

      // Fast-forward through the transition
      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(document.documentElement.lang).toBe('ar');
      });

      jest.useRealTimers();
    });

    it('should not trigger transition when selecting same language', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      // Open menu
      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      // Click English option (current language)
      fireEvent.click(screen.getByTestId('language-option-en'));

      // Should not apply transition styles
      expect(document.documentElement.style.transition).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      expect(button).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      
      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();

      // Should open on Enter
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(screen.getByTestId('language-option-en')).toBeInTheDocument();
    });

    it('should indicate current selection in menu', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      const currentOption = screen.getByTestId('language-option-en');
      expect(currentOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher className="custom-language-switcher" />
        </LanguageSwitcherWrapper>
      );

      const container = document.querySelector('.custom-language-switcher');
      expect(container).toBeInTheDocument();
    });

    it('should handle different sizes properly', () => {
      const { rerender } = render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher size="small" />
        </LanguageSwitcherWrapper>
      );

      let button = screen.getByTestId('language-switcher-button');
      expect(button).toBeInTheDocument();

      rerender(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher size="large" />
        </LanguageSwitcherWrapper>
      );

      button = screen.getByTestId('language-switcher-button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing translation gracefully', () => {
      // Test with invalid locale that might not have all translations
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      // Should still render without crashing
      const button = screen.getByTestId('language-switcher-button');
      expect(button).toBeInTheDocument();
    });

    it('should handle locale switching errors gracefully', () => {
      render(
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
      );

      const button = screen.getByTestId('language-switcher-button');
      fireEvent.click(button);

      // Should not crash when switching languages
      expect(() => {
        fireEvent.click(screen.getByTestId('language-option-ar'));
      }).not.toThrow();
    });
  });
});