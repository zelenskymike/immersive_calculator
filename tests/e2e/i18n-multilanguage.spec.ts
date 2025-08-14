/**
 * Internationalization and Multi-Language E2E Tests
 * Tests language switching, RTL layout, currency formatting, and cultural adaptations
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Multi-Language and Internationalization', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/calculator');
    
    // Wait for app to load
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });

  test.describe('Language Switching', () => {
    test('should switch between English and Arabic', async () => {
      // Verify initial English state
      await expect(page.locator('h1')).toContainText(/TCO|Calculator/i);
      await expect(page.locator('[data-testid="language-switcher"]')).toBeVisible();
      
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      
      // Wait for language change
      await page.waitForTimeout(1000);
      
      // Verify Arabic content
      await expect(page.locator('h1')).toContainText(/حاسبة|التكلفة/);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      
      // Switch back to English
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-en"]').click();
      
      await page.waitForTimeout(1000);
      
      // Verify English restoration
      await expect(page.locator('h1')).toContainText(/TCO|Calculator/i);
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });

    test('should persist language choice across page reloads', async () => {
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
      
      // Verify Arabic is active
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      
      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Verify Arabic is still active
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('should detect browser language preference', async () => {
      // Create new context with Arabic locale
      const arabicContext = await page.context().browser()?.newContext({
        locale: 'ar-SA',
      });
      
      if (arabicContext) {
        const arabicPage = await arabicContext.newPage();
        await arabicPage.goto('/calculator');
        
        // Should auto-detect Arabic locale
        await expect(arabicPage.locator('html')).toHaveAttribute('lang', 'ar');
        
        await arabicContext.close();
      }
    });
  });

  test.describe('RTL Layout and Arabic Support', () => {
    test.beforeEach(async () => {
      // Switch to Arabic for RTL tests
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
    });

    test('should display correct RTL layout', async () => {
      // Verify RTL attributes
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      
      // Check that key UI elements follow RTL
      const navigationElements = page.locator('[data-testid*="nav"]');
      if (await navigationElements.count() > 0) {
        const firstNav = navigationElements.first();
        const textAlign = await firstNav.evaluate(el => 
          window.getComputedStyle(el).textAlign
        );
        expect(['right', 'start'].includes(textAlign)).toBe(true);
      }
      
      // Check form labels are right-aligned
      const formLabels = page.locator('label');
      if (await formLabels.count() > 0) {
        const firstLabel = formLabels.first();
        const styles = await firstLabel.evaluate(el => ({
          direction: window.getComputedStyle(el).direction,
          textAlign: window.getComputedStyle(el).textAlign,
        }));
        
        expect(styles.direction).toBe('rtl');
      }
    });

    test('should handle Arabic text input correctly', async () => {
      // Test Arabic input in text fields (if any)
      const arabicText = 'مركز بيانات تجريبي';
      
      // Look for any text input that might accept Arabic
      const textInputs = page.locator('input[type="text"], textarea');
      const inputCount = await textInputs.count();
      
      if (inputCount > 0) {
        const firstInput = textInputs.first();
        await firstInput.fill(arabicText);
        
        const inputValue = await firstInput.inputValue();
        expect(inputValue).toBe(arabicText);
        
        // Verify RTL display
        const direction = await firstInput.evaluate(el => 
          window.getComputedStyle(el).direction
        );
        expect(direction).toBe('rtl');
      }
    });

    test('should display Arabic numerals correctly', async () => {
      // Fill in numeric inputs
      await page.locator('[data-testid="rack-count-input"]').fill('20');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      
      // Check if Arabic numerals are displayed (depends on implementation)
      const rackCountValue = await page.locator('[data-testid="rack-count-input"]').inputValue();
      
      // Western numerals should still be accepted for calculations
      expect(rackCountValue).toBe('20');
      
      // But display might show Arabic-Indic numerals in labels
      // This would depend on specific localization implementation
    });

    test('should handle form validation messages in Arabic', async () => {
      // Trigger validation error
      await page.locator('[data-testid="rack-count-input"]').fill('0');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      
      // Look for validation error
      const errorMessage = page.locator('[data-testid*="error"], .error-message, [role="alert"]');
      
      if (await errorMessage.count() > 0) {
        const errorText = await errorMessage.first().textContent();
        
        // Should contain Arabic text
        expect(errorText).toMatch(/[\u0600-\u06FF]/); // Arabic Unicode range
        
        // Should be right-aligned
        const textAlign = await errorMessage.first().evaluate(el => 
          window.getComputedStyle(el).textAlign
        );
        expect(['right', 'start'].includes(textAlign)).toBe(true);
      }
    });
  });

  test.describe('Currency and Regional Formatting', () => {
    const regionTests = [
      {
        language: 'en',
        region: 'US',
        currency: 'USD',
        expectedFormat: /\$[\d,]+/,
        decimalSeparator: '.',
        thousandsSeparator: ',',
      },
      {
        language: 'ar',
        region: 'SA',
        currency: 'SAR',
        expectedFormat: /[\d,]+\s*ر\.س/,
        decimalSeparator: '.',
        thousandsSeparator: ',',
      },
      {
        language: 'en',
        region: 'EU',
        currency: 'EUR',
        expectedFormat: /€[\d,]+|[\d,]+\s*€/,
        decimalSeparator: '.',
        thousandsSeparator: ',',
      },
    ];

    regionTests.forEach(({ language, region, currency, expectedFormat }) => {
      test(`should format currency correctly for ${language}-${region}`, async () => {
        // Switch language
        if (language === 'ar') {
          await page.locator('[data-testid="language-switcher"]').click();
          await page.locator('[data-testid="language-option-ar"]').click();
          await page.waitForTimeout(1000);
        }
        
        // Complete calculation workflow
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="target-power-input"]').fill('150');
        await page.locator('[data-testid="next-button"]').click();
        
        // Select region and currency
        await page.locator('[data-testid="region-select"]').selectOption(region);
        await expect(page.locator('[data-testid="currency-select"]')).toHaveValue(currency);
        
        await page.locator('[data-testid="next-button"]').click();
        
        // Calculate
        await page.locator('[data-testid="calculate-button"]').click();
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
        
        // Verify currency formatting in results
        const savingsElement = page.locator('[data-testid="total-savings-value"]');
        await expect(savingsElement).toBeVisible();
        
        const savingsText = await savingsElement.textContent();
        expect(savingsText).toMatch(expectedFormat);
      });
    });

    test('should handle number formatting with large values', async () => {
      // Set up large configuration
      await page.locator('[data-testid="rack-count-input"]').fill('500');
      await page.locator('[data-testid="power-per-rack-input"]').fill('25');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="target-power-input"]').fill('12500');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="calculate-button"]').click();
      await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
      
      // Verify large numbers are formatted with appropriate separators
      const largeNumberElements = page.locator('[data-testid*="savings"], [data-testid*="cost"]');
      const count = await largeNumberElements.count();
      
      if (count > 0) {
        const firstElement = largeNumberElements.first();
        const text = await firstElement.textContent();
        
        // Should contain thousands separators for large numbers
        expect(text).toMatch(/[\d,]+/);
        
        // Should not have more than 3 consecutive digits
        expect(text).not.toMatch(/\d{4,}/);
      }
    });
  });

  test.describe('Cultural and Contextual Adaptations', () => {
    test('should adapt content for Middle Eastern users', async () => {
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
      
      // Check for Middle Eastern specific content
      await page.locator('[data-testid="region-select"]').selectOption('ME');
      
      // Energy costs and other parameters should reflect Middle Eastern values
      const energyCostInput = page.locator('[data-testid="custom-energy-cost-input"]');
      if (await energyCostInput.isVisible()) {
        const placeholder = await energyCostInput.getAttribute('placeholder');
        // Should suggest Middle Eastern energy costs (typically lower)
        expect(placeholder).toMatch(/0\.0[5-9]|0\.1[0-2]/);
      }
    });

    test('should show appropriate help content in Arabic', async () => {
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
      
      // Look for help or info buttons
      const helpButtons = page.locator('[data-testid*="help"], [data-testid*="info"], .help-button, .info-button');
      const helpCount = await helpButtons.count();
      
      if (helpCount > 0) {
        await helpButtons.first().click();
        
        // Help content should be in Arabic
        const helpContent = page.locator('[data-testid*="help-content"], .help-content, [role="dialog"] p');
        
        if (await helpContent.count() > 0) {
          const helpText = await helpContent.first().textContent();
          // Should contain Arabic characters
          expect(helpText).toMatch(/[\u0600-\u06FF]/);
        }
      }
    });

    test('should handle date and time formatting', async () => {
      // Complete a calculation to see timestamps
      await page.locator('[data-testid="rack-count-input"]').fill('10');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="target-power-input"]').fill('150');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="calculate-button"]').click();
      await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
      
      // Look for timestamp or date displays
      const timestampElements = page.locator('[data-testid*="timestamp"], [data-testid*="date"], .timestamp, .date');
      const timestampCount = await timestampElements.count();
      
      if (timestampCount > 0) {
        const timestamp = await timestampElements.first().textContent();
        
        // Should be a valid date format
        expect(timestamp).toMatch(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/);
      }
      
      // Test Arabic date formatting
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
      
      if (timestampCount > 0) {
        const arabicTimestamp = await timestampElements.first().textContent();
        
        // Arabic dates might use Arabic-Indic numerals or different formatting
        expect(arabicTimestamp).toBeDefined();
        expect(arabicTimestamp?.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Accessibility in Different Languages', () => {
    test('should maintain accessibility in Arabic', async () => {
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
      
      // Check for ARIA labels in Arabic
      const labelledElements = page.locator('[aria-label], [aria-labelledby]');
      const labelCount = await labelledElements.count();
      
      if (labelCount > 0) {
        const ariaLabel = await labelledElements.first().getAttribute('aria-label');
        if (ariaLabel) {
          // ARIA labels should be in Arabic
          expect(ariaLabel).toMatch(/[\u0600-\u06FF]/);
        }
      }
      
      // Check form labels are properly associated
      const formLabels = page.locator('label[for]');
      const labelForCount = await formLabels.count();
      
      if (labelForCount > 0) {
        const labelText = await formLabels.first().textContent();
        expect(labelText).toMatch(/[\u0600-\u06FF]/);
        
        const forAttribute = await formLabels.first().getAttribute('for');
        const associatedInput = page.locator(`#${forAttribute}`);
        await expect(associatedInput).toBeVisible();
      }
    });

    test('should support keyboard navigation in RTL', async () => {
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBeDefined();
      
      // Test arrow key navigation in RTL context
      const selectElements = page.locator('select, [role="combobox"]');
      const selectCount = await selectElements.count();
      
      if (selectCount > 0) {
        await selectElements.first().focus();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        
        // Should maintain proper navigation in RTL
        expect(await selectElements.first().evaluate(el => el === document.activeElement)).toBe(true);
      }
    });

    test('should announce content changes in Arabic', async () => {
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
      
      // Check for live regions that should announce changes
      const liveRegions = page.locator('[aria-live]');
      const liveCount = await liveRegions.count();
      
      if (liveCount > 0) {
        const ariaLive = await liveRegions.first().getAttribute('aria-live');
        expect(['polite', 'assertive', 'off'].includes(ariaLive || '')).toBe(true);
      }
      
      // Trigger a change that should be announced
      await page.locator('[data-testid="rack-count-input"]').fill('0'); // Invalid value
      
      // Look for error announcements
      const errorRegions = page.locator('[role="alert"], [aria-live="assertive"]');
      const errorCount = await errorRegions.count();
      
      if (errorCount > 0) {
        const errorText = await errorRegions.first().textContent();
        // Error should be in Arabic
        expect(errorText).toMatch(/[\u0600-\u06FF]/);
      }
    });
  });

  test.describe('Performance with Different Languages', () => {
    test('should load Arabic fonts efficiently', async () => {
      const startTime = Date.now();
      
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      
      // Wait for font loading
      await page.waitForTimeout(2000);
      
      const loadTime = Date.now() - startTime;
      
      // Arabic font loading should complete quickly
      expect(loadTime).toBeLessThan(5000);
      
      // Verify Arabic text renders correctly
      const arabicText = page.locator('h1');
      const fontSize = await arabicText.evaluate(el => 
        window.getComputedStyle(el).fontSize
      );
      
      expect(parseInt(fontSize)).toBeGreaterThan(12);
    });

    test('should maintain performance with RTL layout calculations', async () => {
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);
      
      const startTime = Date.now();
      
      // Perform calculation workflow
      await page.locator('[data-testid="rack-count-input"]').fill('25');
      await page.locator('[data-testid="power-per-rack-input"]').fill('18');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="target-power-input"]').fill('450');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="calculate-button"]').click();
      await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 15000 });
      
      const totalTime = Date.now() - startTime;
      
      // RTL calculation should complete within reasonable time
      expect(totalTime).toBeLessThan(15000);
      
      // Verify results display correctly in RTL
      await expect(page.locator('[data-testid="total-savings-value"]')).toBeVisible();
    });
  });
});