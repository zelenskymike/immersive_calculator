/**
 * WCAG 2.1 AA Accessibility Testing Suite
 * Comprehensive accessibility tests for compliance with WCAG 2.1 AA standards
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Accessibility Compliance', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/calculator');
    
    // Wait for app to load completely
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });

  test.describe('Automated Accessibility Scanning', () => {
    test('should pass axe-core accessibility scan on main page', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should pass accessibility scan on calculator form pages', async () => {
      // Test air cooling configuration page
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('[data-testid="loading"]') // Exclude loading states
        .analyze()
        .then(results => {
          expect(results.violations).toEqual([]);
        });

      // Navigate to immersion cooling page
      await page.locator('[data-testid="rack-count-input"]').fill('10');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      await page.locator('[data-testid="next-button"]').click();

      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        .then(results => {
          expect(results.violations).toEqual([]);
        });

      // Navigate to financial configuration page
      await page.locator('[data-testid="target-power-input"]').fill('150');
      await page.locator('[data-testid="next-button"]').click();

      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        .then(results => {
          expect(results.violations).toEqual([]);
        });
    });

    test('should pass accessibility scan on results page', async () => {
      // Complete calculation workflow
      await page.locator('[data-testid="rack-count-input"]').fill('10');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="target-power-input"]').fill('150');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="next-button"]').click(); // Skip financial with defaults
      
      await page.locator('[data-testid="calculate-button"]').click();
      await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
      
      // Test results page accessibility
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('[data-testid="chart"]') // Charts may have known accessibility limitations
        .analyze()
        .then(results => {
          expect(results.violations).toEqual([]);
        });
    });

    test('should pass accessibility scan in Arabic/RTL mode', async () => {
      // Switch to Arabic
      await page.locator('[data-testid="language-switcher"]').click();
      await page.locator('[data-testid="language-option-ar"]').click();
      await page.waitForTimeout(1000);

      // Verify RTL layout doesn't break accessibility
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        .then(results => {
          expect(results.violations).toEqual([]);
        });
    });
  });

  test.describe('WCAG 2.1 Principle 1: Perceivable', () => {
    test.describe('1.1 Text Alternatives', () => {
      test('should provide text alternatives for images', async () => {
        const images = page.locator('img');
        const imageCount = await images.count();
        
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt');
          const ariaLabel = await img.getAttribute('aria-label');
          const ariaLabelledby = await img.getAttribute('aria-labelledby');
          
          // Images should have alt text, aria-label, or aria-labelledby
          expect(alt !== null || ariaLabel !== null || ariaLabelledby !== null).toBe(true);
          
          // Alt text should not be empty for meaningful images
          if (alt !== null) {
            const isDecorative = alt === '';
            const role = await img.getAttribute('role');
            
            if (!isDecorative && role !== 'presentation') {
              expect(alt.length).toBeGreaterThan(0);
            }
          }
        }
      });

      test('should provide text alternatives for icons', async () => {
        const icons = page.locator('[data-testid*="icon"], .icon, i[class*="icon"], svg');
        const iconCount = await icons.count();
        
        for (let i = 0; i < iconCount; i++) {
          const icon = icons.nth(i);
          const ariaLabel = await icon.getAttribute('aria-label');
          const title = await icon.getAttribute('title');
          const ariaLabelledby = await icon.getAttribute('aria-labelledby');
          const role = await icon.getAttribute('role');
          
          // Icons should have accessible names unless they're decorative
          if (role !== 'presentation' && role !== 'img') {
            const hasAccessibleName = ariaLabel || title || ariaLabelledby;
            expect(hasAccessibleName).toBeTruthy();
          }
        }
      });

      test('should provide text alternatives for charts', async () => {
        // Complete calculation to see charts
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="target-power-input"]').fill('150');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="calculate-button"]').click();
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
        
        // Check chart accessibility
        const charts = page.locator('[data-testid*="chart"], canvas, svg[role="img"]');
        const chartCount = await charts.count();
        
        for (let i = 0; i < chartCount; i++) {
          const chart = charts.nth(i);
          const ariaLabel = await chart.getAttribute('aria-label');
          const title = await chart.getAttribute('title');
          const ariaDescribedby = await chart.getAttribute('aria-describedby');
          
          // Charts should have accessible descriptions
          expect(ariaLabel || title || ariaDescribedby).toBeTruthy();
          
          // Check for data table alternative or detailed description
          if (ariaDescribedby) {
            const description = page.locator(`#${ariaDescribedby}`);
            await expect(description).toBeVisible();
          }
        }
      });
    });

    test.describe('1.2 Time-based Media', () => {
      test('should not have auto-playing media without controls', async () => {
        const mediaElements = page.locator('video, audio');
        const mediaCount = await mediaElements.count();
        
        for (let i = 0; i < mediaCount; i++) {
          const media = mediaElements.nth(i);
          const autoplay = await media.getAttribute('autoplay');
          const controls = await media.getAttribute('controls');
          const muted = await media.getAttribute('muted');
          
          // If autoplay is enabled, should have controls or be muted
          if (autoplay !== null) {
            expect(controls !== null || muted !== null).toBe(true);
          }
        }
      });
    });

    test.describe('1.3 Adaptable', () => {
      test('should have proper heading hierarchy', async () => {
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const headingCount = await headings.count();
        
        if (headingCount > 0) {
          // Check for h1 on page
          const h1Count = await page.locator('h1').count();
          expect(h1Count).toBeGreaterThan(0);
          
          // Verify heading hierarchy is logical
          const headingLevels = [];
          for (let i = 0; i < headingCount; i++) {
            const heading = headings.nth(i);
            const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
            const level = parseInt(tagName.charAt(1));
            headingLevels.push(level);
          }
          
          // Check that heading levels don't skip more than one level
          for (let i = 1; i < headingLevels.length; i++) {
            const currentLevel = headingLevels[i];
            const prevLevel = headingLevels[i - 1];
            
            if (currentLevel > prevLevel) {
              expect(currentLevel - prevLevel).toBeLessThanOrEqual(1);
            }
          }
        }
      });

      test('should have proper form structure with labels', async () => {
        const formInputs = page.locator('input, select, textarea');
        const inputCount = await formInputs.count();
        
        for (let i = 0; i < inputCount; i++) {
          const input = formInputs.nth(i);
          const inputType = await input.getAttribute('type');
          const inputId = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledby = await input.getAttribute('aria-labelledby');
          
          // Skip hidden inputs
          if (inputType === 'hidden') continue;
          
          // Input should have an accessible name
          const hasAccessibleName = ariaLabel || ariaLabelledby;
          let hasLabel = false;
          
          if (inputId) {
            const label = page.locator(`label[for="${inputId}"]`);
            hasLabel = await label.count() > 0;
          }
          
          expect(hasAccessibleName || hasLabel).toBe(true);
        }
      });

      test('should maintain meaning when CSS is disabled', async () => {
        // Disable CSS
        await page.addStyleTag({ content: '* { all: unset !important; }' });
        
        // Verify content is still readable
        const mainHeading = page.locator('h1');
        await expect(mainHeading).toBeVisible();
        
        const formInputs = page.locator('input[type="number"], input[type="text"]');
        const visibleInputs = await formInputs.count();
        expect(visibleInputs).toBeGreaterThan(0);
        
        // Verify labels are still associated
        const labels = page.locator('label');
        const labelCount = await labels.count();
        expect(labelCount).toBeGreaterThan(0);
      });

      test('should have proper table structure for data tables', async () => {
        // Complete calculation to see data tables
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="target-power-input"]').fill('150');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="calculate-button"]').click();
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
        
        // Check breakdown table
        await page.locator('[data-testid="tab-breakdown"]').click();
        
        const tables = page.locator('table');
        const tableCount = await tables.count();
        
        for (let i = 0; i < tableCount; i++) {
          const table = tables.nth(i);
          
          // Tables should have captions or accessible names
          const caption = table.locator('caption');
          const ariaLabel = await table.getAttribute('aria-label');
          const ariaLabelledby = await table.getAttribute('aria-labelledby');
          
          const hasCaptionOrLabel = await caption.count() > 0 || ariaLabel || ariaLabelledby;
          expect(hasCaptionOrLabel).toBe(true);
          
          // Check for proper header structure
          const headers = table.locator('th');
          const headerCount = await headers.count();
          
          if (headerCount > 0) {
            // Headers should have proper scope
            for (let j = 0; j < headerCount; j++) {
              const header = headers.nth(j);
              const scope = await header.getAttribute('scope');
              
              // If scope is not explicitly set, it should be inferrable from structure
              if (!scope) {
                const parent = await header.locator('..').evaluate(el => el.tagName.toLowerCase());
                expect(['tr', 'thead'].includes(parent)).toBe(true);
              }
            }
          }
        }
      });
    });

    test.describe('1.4 Distinguishable', () => {
      test('should have sufficient color contrast', async () => {
        // This would typically be caught by axe-core, but we can do additional checks
        const textElements = page.locator('p, span, div, label, button, a, h1, h2, h3, h4, h5, h6');
        const elementCount = await textElements.count();
        
        // Sample a few elements for color contrast checking
        const sampleSize = Math.min(10, elementCount);
        
        for (let i = 0; i < sampleSize; i++) {
          const element = textElements.nth(i * Math.floor(elementCount / sampleSize));
          
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
            };
          });
          
          // Elements should have explicit colors (not inherit)
          expect(styles.color).not.toBe('inherit');
          
          // Font size should be reasonable
          const fontSize = parseFloat(styles.fontSize);
          expect(fontSize).toBeGreaterThan(10); // Minimum readable size
        }
      });

      test('should not rely solely on color to convey information', async () => {
        // Check for validation errors that might rely on color only
        await page.locator('[data-testid="rack-count-input"]').fill('0');
        
        const errorElements = page.locator('[data-testid*="error"], .error, [role="alert"]');
        const errorCount = await errorElements.count();
        
        for (let i = 0; i < errorCount; i++) {
          const error = errorElements.nth(i);
          const text = await error.textContent();
          
          // Error should have text content, not just be a colored indicator
          expect(text?.trim().length).toBeGreaterThan(0);
          
          // Should have appropriate role or ARIA attributes
          const role = await error.getAttribute('role');
          const ariaLive = await error.getAttribute('aria-live');
          
          expect(role === 'alert' || ariaLive !== null).toBe(true);
        }
      });

      test('should allow text resize up to 200%', async () => {
        // Get original dimensions
        const originalSize = await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight,
        }));
        
        // Increase font size
        await page.addStyleTag({
          content: `
            * {
              font-size: 200% !important;
            }
          `,
        });
        
        await page.waitForTimeout(1000);
        
        // Verify content is still accessible
        const mainHeading = page.locator('h1');
        await expect(mainHeading).toBeVisible();
        
        // Verify form inputs are still functional
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        const inputValue = await page.locator('[data-testid="rack-count-input"]').inputValue();
        expect(inputValue).toBe('10');
        
        // Verify no horizontal scrolling is required (unless absolutely necessary)
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        
        // This is a soft check - some horizontal scrolling might be acceptable
        if (hasHorizontalScroll) {
          console.warn('Horizontal scrolling detected at 200% zoom');
        }
      });

      test('should support high contrast mode', async () => {
        // Simulate high contrast mode
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.addStyleTag({
          content: `
            @media (prefers-contrast: high) {
              * {
                background: black !important;
                color: white !important;
                border-color: white !important;
              }
            }
          `,
        });
        
        await page.waitForTimeout(1000);
        
        // Verify content is still visible and functional
        const mainHeading = page.locator('h1');
        await expect(mainHeading).toBeVisible();
        
        // Test form interaction
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await expect(page.locator('[data-testid="rack-count-input"]')).toHaveValue('10');
        
        // Run accessibility check in high contrast mode
        const accessibilityResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        
        expect(accessibilityResults.violations).toEqual([]);
      });

      test('should handle text spacing modifications', async () => {
        // Apply WCAG 2.1 text spacing requirements
        await page.addStyleTag({
          content: `
            * {
              line-height: 1.5 !important;
              letter-spacing: 0.12em !important;
              word-spacing: 0.16em !important;
            }
            
            p {
              margin-bottom: 2em !important;
            }
          `,
        });
        
        await page.waitForTimeout(1000);
        
        // Verify content is still readable and functional
        const textElements = page.locator('p, span, div, label');
        const textCount = await textElements.count();
        
        // Sample elements should still be visible
        if (textCount > 0) {
          for (let i = 0; i < Math.min(5, textCount); i++) {
            const element = textElements.nth(i);
            await expect(element).toBeVisible();
          }
        }
        
        // Forms should still be functional
        await page.locator('[data-testid="rack-count-input"]').fill('15');
        await expect(page.locator('[data-testid="rack-count-input"]')).toHaveValue('15');
      });
    });
  });

  test.describe('WCAG 2.1 Principle 2: Operable', () => {
    test.describe('2.1 Keyboard Accessible', () => {
      test('should be fully keyboard accessible', async () => {
        // Test tab order through main form
        await page.keyboard.press('Tab');
        let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeDefined();
        
        // Continue tabbing through form
        const tabbableElements = [];
        let lastFocused = '';
        
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('Tab');
          const currentFocus = await page.evaluate(() => {
            const el = document.activeElement;
            return el ? `${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}` : 'none';
          });
          
          if (currentFocus === lastFocused) break;
          
          tabbableElements.push(currentFocus);
          lastFocused = currentFocus;
        }
        
        // Should have found tabbable elements
        expect(tabbableElements.length).toBeGreaterThan(0);
        
        // Test reverse tab order
        await page.keyboard.press('Shift+Tab');
        const reverseFocus = await page.evaluate(() => {
          const el = document.activeElement;
          return el ? `${el.tagName}${el.id ? '#' + el.id : ''}` : 'none';
        });
        
        expect(reverseFocus).toBeDefined();
      });

      test('should allow form completion using only keyboard', async () => {
        // Tab to first input
        while (true) {
          await page.keyboard.press('Tab');
          const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
          if (focused === 'rack-count-input') break;
        }
        
        // Fill first input
        await page.keyboard.type('10');
        
        // Tab to second input
        await page.keyboard.press('Tab');
        const secondInput = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
        expect(secondInput).toBe('power-per-rack-input');
        
        await page.keyboard.type('15');
        
        // Tab to next button
        while (true) {
          await page.keyboard.press('Tab');
          const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
          if (focused === 'next-button') break;
        }
        
        // Activate next button
        await page.keyboard.press('Enter');
        
        // Should be on next page
        await expect(page.locator('[data-testid="step-immersion-cooling"]')).toBeVisible();
      });

      test('should provide visible focus indicators', async () => {
        const focusableElements = page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const elementCount = await focusableElements.count();
        
        // Test focus indicators on a sample of elements
        const sampleSize = Math.min(5, elementCount);
        
        for (let i = 0; i < sampleSize; i++) {
          const element = focusableElements.nth(i);
          await element.focus();
          
          // Check for focus indicators
          const focusStyles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el, ':focus');
            return {
              outline: computed.outline,
              outlineWidth: computed.outlineWidth,
              outlineColor: computed.outlineColor,
              boxShadow: computed.boxShadow,
              borderColor: computed.borderColor,
            };
          });
          
          // Should have some form of focus indicator
          const hasFocusIndicator = 
            focusStyles.outline !== 'none' ||
            focusStyles.outlineWidth !== '0px' ||
            focusStyles.boxShadow !== 'none' ||
            focusStyles.borderColor !== 'transparent';
          
          expect(hasFocusIndicator).toBe(true);
        }
      });

      test('should have no keyboard traps', async () => {
        let tabCount = 0;
        const maxTabs = 50;
        let focusHistory: string[] = [];
        
        while (tabCount < maxTabs) {
          await page.keyboard.press('Tab');
          const currentFocus = await page.evaluate(() => {
            const el = document.activeElement;
            return el?.tagName + (el?.id ? '#' + el.id : '') + (el?.className ? '.' + el.className.split(' ')[0] : '');
          });
          
          focusHistory.push(currentFocus);
          
          // Check if we're in a keyboard trap (same element focused repeatedly)
          if (focusHistory.length > 10) {
            const recent = focusHistory.slice(-5);
            if (recent.every(item => item === recent[0])) {
              throw new Error(`Keyboard trap detected at element: ${recent[0]}`);
            }
          }
          
          tabCount++;
        }
      });
    });

    test.describe('2.2 Enough Time', () => {
      test('should not have time limits without warnings', async () => {
        // Start calculation
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="target-power-input"]').fill('150');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="calculate-button"]').click();
        
        // Wait for calculation - should not timeout without warning
        await expect(page.locator('[data-testid="calculation-loading"]')).toBeVisible();
        
        // Check for timeout warnings or progress indicators
        const progressIndicators = page.locator('[role="progressbar"], [aria-live="polite"]');
        const hasProgressIndicator = await progressIndicators.count() > 0;
        
        // Should have progress indicators for long operations
        expect(hasProgressIndicator).toBe(true);
        
        // Should complete within reasonable time
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 15000 });
      });

      test('should allow pausing/stopping of auto-updating content', async () => {
        // Check for any auto-updating elements
        const autoUpdateElements = page.locator('[data-auto-update], [data-refresh]');
        const autoUpdateCount = await autoUpdateElements.count();
        
        if (autoUpdateCount > 0) {
          // Should have controls to pause/stop auto-updates
          const pauseControls = page.locator('[data-testid*="pause"], [aria-label*="pause"], button[title*="pause"]');
          const hasPauseControls = await pauseControls.count() > 0;
          
          expect(hasPauseControls).toBe(true);
        }
      });
    });

    test.describe('2.3 Seizures and Physical Reactions', () => {
      test('should not contain flashing content', async () => {
        // Check for elements that might flash
        const animatedElements = page.locator('[class*="animate"], [class*="flash"], [class*="blink"]');
        const animatedCount = await animatedElements.count();
        
        if (animatedCount > 0) {
          // Animations should be subtle and not flash rapidly
          for (let i = 0; i < animatedCount; i++) {
            const element = animatedElements.nth(i);
            const animation = await element.evaluate(el => {
              const computed = window.getComputedStyle(el);
              return {
                animationDuration: computed.animationDuration,
                animationName: computed.animationName,
              };
            });
            
            // If there's an animation, it should be slow enough to be safe
            if (animation.animationDuration !== 'none') {
              const duration = parseFloat(animation.animationDuration);
              expect(duration).toBeGreaterThan(0.5); // No faster than 2 flashes per second
            }
          }
        }
      });
    });

    test.describe('2.4 Navigable', () => {
      test('should have descriptive page titles', async () => {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        expect(title).toMatch(/TCO|Calculator|Total Cost/i);
      });

      test('should provide skip links', async () => {
        // Look for skip links
        const skipLinks = page.locator('a[href^="#"], [data-testid*="skip"]');
        const skipLinkCount = await skipLinks.count();
        
        if (skipLinkCount > 0) {
          const firstSkipLink = skipLinks.first();
          const href = await firstSkipLink.getAttribute('href');
          
          // Skip link should point to main content
          expect(href?.startsWith('#')).toBe(true);
          
          // Target should exist
          if (href) {
            const target = page.locator(href);
            await expect(target).toBeAttached();
          }
        }
      });

      test('should have logical focus order', async () => {
        const focusOrder: string[] = [];
        
        // Tab through first few elements and record order
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          const focused = await page.evaluate(() => {
            const el = document.activeElement;
            return el?.getAttribute('data-testid') || el?.tagName || 'unknown';
          });
          
          focusOrder.push(focused);
        }
        
        // Focus order should be logical (this is a basic check)
        expect(focusOrder.length).toBeGreaterThan(0);
        
        // Should focus form elements before buttons
        const firstInputIndex = focusOrder.findIndex(item => item.includes('input'));
        const firstButtonIndex = focusOrder.findIndex(item => item.includes('button') || item === 'BUTTON');
        
        if (firstInputIndex !== -1 && firstButtonIndex !== -1) {
          expect(firstInputIndex).toBeLessThan(firstButtonIndex);
        }
      });

      test('should have descriptive link text', async () => {
        const links = page.locator('a');
        const linkCount = await links.count();
        
        for (let i = 0; i < linkCount; i++) {
          const link = links.nth(i);
          const text = await link.textContent();
          const ariaLabel = await link.getAttribute('aria-label');
          const title = await link.getAttribute('title');
          
          const accessibleText = ariaLabel || text || title;
          
          // Links should have descriptive text
          expect(accessibleText?.trim().length).toBeGreaterThan(0);
          
          // Should not be generic text like "click here" or "read more"
          const genericTerms = ['click here', 'read more', 'more', 'here', 'link'];
          const isGeneric = genericTerms.some(term => 
            accessibleText?.toLowerCase().trim() === term
          );
          
          expect(isGeneric).toBe(false);
        }
      });

      test('should provide multiple ways to navigate', async () => {
        // Check for navigation elements
        const navElements = page.locator('nav, [role="navigation"]');
        const navCount = await navElements.count();
        
        // Should have navigation elements
        expect(navCount).toBeGreaterThan(0);
        
        // Check for breadcrumbs or step indicators
        const breadcrumbs = page.locator('[data-testid*="breadcrumb"], [data-testid*="step"], .breadcrumb, [aria-label*="step"]');
        const breadcrumbCount = await breadcrumbs.count();
        
        // Multi-step forms should have step indicators
        expect(breadcrumbCount).toBeGreaterThan(0);
      });
    });

    test.describe('2.5 Input Modalities', () => {
      test('should support touch interactions on mobile', async () => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Test touch interactions
        const touchElements = page.locator('button, [role="button"]');
        const elementCount = await touchElements.count();
        
        if (elementCount > 0) {
          const firstButton = touchElements.first();
          
          // Elements should be large enough for touch (minimum 44px)
          const boundingBox = await firstButton.boundingBox();
          if (boundingBox) {
            expect(boundingBox.width).toBeGreaterThanOrEqual(44);
            expect(boundingBox.height).toBeGreaterThanOrEqual(44);
          }
        }
      });

      test('should provide accessible labels for pointer inputs', async () => {
        const interactiveElements = page.locator('button, [role="button"], input, select');
        const elementCount = await interactiveElements.count();
        
        for (let i = 0; i < Math.min(5, elementCount); i++) {
          const element = interactiveElements.nth(i);
          const accessibleName = await element.evaluate(el => {
            // Check various ways an element can have an accessible name
            return el.getAttribute('aria-label') ||
                   el.getAttribute('aria-labelledby') ||
                   el.textContent ||
                   el.getAttribute('title') ||
                   el.getAttribute('alt');
          });
          
          expect(accessibleName?.trim().length).toBeGreaterThan(0);
        }
      });
    });
  });

  test.describe('WCAG 2.1 Principle 3: Understandable', () => {
    test.describe('3.1 Readable', () => {
      test('should specify language of page', async () => {
        const htmlLang = await page.getAttribute('html', 'lang');
        expect(htmlLang).toBeTruthy();
        expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // Valid language code format
      });

      test('should identify changes in language', async () => {
        // Switch to Arabic to test language changes
        await page.locator('[data-testid="language-switcher"]').click();
        await page.locator('[data-testid="language-option-ar"]').click();
        await page.waitForTimeout(1000);
        
        // Check that HTML lang attribute changed
        const htmlLang = await page.getAttribute('html', 'lang');
        expect(htmlLang).toBe('ar');
        
        // Look for any elements with different languages
        const langElements = page.locator('[lang]');
        const langCount = await langElements.count();
        
        if (langCount > 0) {
          for (let i = 0; i < langCount; i++) {
            const element = langElements.nth(i);
            const lang = await element.getAttribute('lang');
            expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
          }
        }
      });
    });

    test.describe('3.2 Predictable', () => {
      test('should not cause unexpected context changes on focus', async () => {
        // Focus on form elements and verify no unexpected navigation
        const formElements = page.locator('input, select, textarea');
        const elementCount = await formElements.count();
        
        for (let i = 0; i < Math.min(3, elementCount); i++) {
          const element = formElements.nth(i);
          const currentUrl = page.url();
          
          await element.focus();
          await page.waitForTimeout(500);
          
          // URL should not change on focus
          const newUrl = page.url();
          expect(newUrl).toBe(currentUrl);
        }
      });

      test('should not cause unexpected context changes on input', async () => {
        const currentUrl = page.url();
        
        // Type in form fields
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.waitForTimeout(500);
        
        // URL should not change during input
        const newUrl = page.url();
        expect(newUrl).toBe(currentUrl);
      });

      test('should have consistent navigation', async () => {
        // Check navigation consistency across pages
        const navElements = page.locator('nav a, [role="navigation"] a');
        const initialNavCount = await navElements.count();
        
        if (initialNavCount > 0) {
          const initialNavItems = [];
          for (let i = 0; i < initialNavCount; i++) {
            const text = await navElements.nth(i).textContent();
            initialNavItems.push(text);
          }
          
          // Navigate to next step
          await page.locator('[data-testid="rack-count-input"]').fill('10');
          await page.locator('[data-testid="power-per-rack-input"]').fill('15');
          await page.locator('[data-testid="next-button"]').click();
          
          // Check navigation consistency
          const newNavElements = page.locator('nav a, [role="navigation"] a');
          const newNavCount = await newNavElements.count();
          
          if (newNavCount > 0) {
            const newNavItems = [];
            for (let i = 0; i < newNavCount; i++) {
              const text = await newNavElements.nth(i).textContent();
              newNavItems.push(text);
            }
            
            // Navigation should be consistent (allowing for reasonable changes)
            const commonItems = initialNavItems.filter(item => newNavItems.includes(item));
            expect(commonItems.length).toBeGreaterThan(0);
          }
        }
      });
    });

    test.describe('3.3 Input Assistance', () => {
      test('should provide error identification', async () => {
        // Trigger validation errors
        await page.locator('[data-testid="rack-count-input"]').fill('0');
        await page.locator('[data-testid="power-per-rack-input"]').fill('100');
        
        // Look for error messages
        const errorElements = page.locator('[data-testid*="error"], [role="alert"], .error-message');
        const errorCount = await errorElements.count();
        
        if (errorCount > 0) {
          for (let i = 0; i < errorCount; i++) {
            const error = errorElements.nth(i);
            const errorText = await error.textContent();
            
            // Error should describe the problem
            expect(errorText?.trim().length).toBeGreaterThan(0);
            expect(errorText).toMatch(/(invalid|error|required|must|should)/i);
            
            // Error should be announced to screen readers
            const role = await error.getAttribute('role');
            const ariaLive = await error.getAttribute('aria-live');
            
            expect(role === 'alert' || ariaLive !== null).toBe(true);
          }
        }
      });

      test('should provide helpful error messages', async () => {
        // Test various invalid inputs
        const invalidInputs = [
          { field: 'rack-count-input', value: '-5', expected: /positive|greater than|minimum/ },
          { field: 'power-per-rack-input', value: '1000', expected: /maximum|limit|too high/ },
        ];
        
        for (const { field, value, expected } of invalidInputs) {
          await page.locator(`[data-testid="${field}"]`).fill(value);
          await page.locator('[data-testid="next-button"]').click();
          
          const errorMessage = page.locator(`[data-testid="${field}-error"], [data-testid*="error"]`);
          
          if (await errorMessage.count() > 0) {
            const errorText = await errorMessage.first().textContent();
            expect(errorText).toMatch(expected);
          }
        }
      });

      test('should provide labels and instructions', async () => {
        const formElements = page.locator('input, select, textarea');
        const elementCount = await formElements.count();
        
        for (let i = 0; i < elementCount; i++) {
          const element = formElements.nth(i);
          const inputType = await element.getAttribute('type');
          
          // Skip hidden inputs
          if (inputType === 'hidden') continue;
          
          // Check for labels
          const elementId = await element.getAttribute('id');
          const ariaLabel = await element.getAttribute('aria-label');
          const ariaLabelledby = await element.getAttribute('aria-labelledby');
          const ariaDescribedby = await element.getAttribute('aria-describedby');
          
          let hasLabel = false;
          
          if (elementId) {
            const label = page.locator(`label[for="${elementId}"]`);
            hasLabel = await label.count() > 0;
          }
          
          const hasAccessibleName = ariaLabel || ariaLabelledby || hasLabel;
          expect(hasAccessibleName).toBe(true);
          
          // Check for additional instructions if present
          if (ariaDescribedby) {
            const description = page.locator(`#${ariaDescribedby}`);
            await expect(description).toBeAttached();
          }
        }
      });

      test('should prevent and handle errors', async () => {
        // Test form submission with empty required fields
        await page.locator('[data-testid="next-button"]').click();
        
        // Should show validation errors
        const validationErrors = page.locator('[role="alert"], [data-testid*="error"]');
        const errorCount = await validationErrors.count();
        
        if (errorCount > 0) {
          // Errors should be visible and accessible
          for (let i = 0; i < errorCount; i++) {
            const error = validationErrors.nth(i);
            await expect(error).toBeVisible();
            
            const errorText = await error.textContent();
            expect(errorText?.trim().length).toBeGreaterThan(0);
          }
          
          // Focus should move to first error
          const firstErrorField = page.locator('input:invalid, [aria-invalid="true"]').first();
          
          if (await firstErrorField.count() > 0) {
            const isFocused = await firstErrorField.evaluate(el => el === document.activeElement);
            expect(isFocused).toBe(true);
          }
        }
      });
    });
  });

  test.describe('WCAG 2.1 Principle 4: Robust', () => {
    test.describe('4.1 Compatible', () => {
      test('should have valid HTML markup', async () => {
        // Basic HTML validation checks
        const doctype = await page.evaluate(() => {
          const node = document.doctype;
          return node ? node.name : null;
        });
        
        expect(doctype).toBe('html');
        
        // Check for duplicate IDs
        const elementsWithIds = page.locator('[id]');
        const idCount = await elementsWithIds.count();
        const ids = [];
        
        for (let i = 0; i < idCount; i++) {
          const id = await elementsWithIds.nth(i).getAttribute('id');
          if (id) ids.push(id);
        }
        
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length); // No duplicate IDs
      });

      test('should have proper ARIA attributes', async () => {
        // Check for invalid ARIA attributes
        const ariaElements = page.locator('[aria-label], [aria-labelledby], [aria-describedby], [role]');
        const ariaCount = await ariaElements.count();
        
        for (let i = 0; i < Math.min(10, ariaCount); i++) {
          const element = ariaElements.nth(i);
          
          // Check aria-labelledby references
          const labelledby = await element.getAttribute('aria-labelledby');
          if (labelledby) {
            const referencedElements = labelledby.split(' ');
            for (const id of referencedElements) {
              const referencedElement = page.locator(`#${id}`);
              await expect(referencedElement).toBeAttached();
            }
          }
          
          // Check aria-describedby references
          const describedby = await element.getAttribute('aria-describedby');
          if (describedby) {
            const referencedElements = describedby.split(' ');
            for (const id of referencedElements) {
              const referencedElement = page.locator(`#${id}`);
              await expect(referencedElement).toBeAttached();
            }
          }
          
          // Check role validity
          const role = await element.getAttribute('role');
          if (role) {
            const validRoles = [
              'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
              'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
              'definition', 'dialog', 'directory', 'document', 'form', 'grid',
              'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox',
              'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar',
              'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation', 'note',
              'option', 'presentation', 'progressbar', 'radio', 'radiogroup',
              'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search',
              'separator', 'slider', 'spinbutton', 'status', 'tab', 'tablist',
              'tabpanel', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree',
              'treeitem', 'treegrid',
            ];
            
            expect(validRoles.includes(role.toLowerCase())).toBe(true);
          }
        }
      });

      test('should provide accessible names and descriptions', async () => {
        // Check that interactive elements have accessible names
        const interactiveElements = page.locator(
          'button, [role="button"], input:not([type="hidden"]), select, textarea, a'
        );
        const elementCount = await interactiveElements.count();
        
        for (let i = 0; i < elementCount; i++) {
          const element = interactiveElements.nth(i);
          
          const accessibleName = await element.evaluate(el => {
            // This is a simplified version of accessible name calculation
            return (
              el.getAttribute('aria-label') ||
              el.getAttribute('aria-labelledby') ||
              el.textContent?.trim() ||
              el.getAttribute('title') ||
              el.getAttribute('alt') ||
              (el as HTMLInputElement).labels?.[0]?.textContent?.trim()
            );
          });
          
          expect(accessibleName?.length).toBeGreaterThan(0);
        }
      });
    });
  });
});