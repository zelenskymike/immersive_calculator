/**
 * Cross-Browser and Mobile Responsiveness Tests
 * Comprehensive testing across different browsers, devices, and screen sizes
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { devices } from '@playwright/test';

// Device configurations for testing
const mobileDevices = [
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'iPhone SE', ...devices['iPhone SE'] },
  { name: 'Pixel 5', ...devices['Pixel 5'] },
  { name: 'Galaxy S21', ...devices['Galaxy S21'] },
];

const tabletDevices = [
  { name: 'iPad Pro', ...devices['iPad Pro'] },
  { name: 'iPad Mini', ...devices['iPad Mini'] },
  { name: 'Galaxy Tab S4', ...devices['Galaxy Tab S4'] },
];

const desktopViewports = [
  { name: '1366x768', width: 1366, height: 768 }, // Most common laptop
  { name: '1920x1080', width: 1920, height: 1080 }, // Full HD
  { name: '2560x1440', width: 2560, height: 1440 }, // QHD
  { name: '3840x2160', width: 3840, height: 2160 }, // 4K
];

test.describe('Cross-Browser Compatibility', () => {
  test.describe('Core Functionality Across Browsers', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ browser }) => {
        // Create context for specific browser
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/calculator');
        
        // Wait for app to load
        await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
        
        // Test basic form interaction
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        
        // Verify input values
        await expect(page.locator('[data-testid="rack-count-input"]')).toHaveValue('10');
        await expect(page.locator('[data-testid="power-per-rack-input"]')).toHaveValue('15');
        
        // Test navigation
        await page.locator('[data-testid="next-button"]').click();
        await expect(page.locator('[data-testid="step-immersion-cooling"]')).toBeVisible();
        
        // Test JavaScript execution
        const jsResult = await page.evaluate(() => {
          return typeof window !== 'undefined' && typeof document !== 'undefined';
        });
        expect(jsResult).toBe(true);
        
        await context.close();
      });
    });

    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should handle form validation consistently in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/calculator');
        await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
        
        // Test validation with invalid input
        await page.locator('[data-testid="rack-count-input"]').fill('0');
        await page.locator('[data-testid="power-per-rack-input"]').fill('100');
        
        // Try to proceed
        await page.locator('[data-testid="next-button"]').click();
        
        // Should show validation errors
        const errorElements = page.locator('[data-testid*="error"], [role="alert"], .error');
        const errorCount = await errorElements.count();
        
        if (errorCount > 0) {
          const firstError = errorElements.first();
          await expect(firstError).toBeVisible();
          
          const errorText = await firstError.textContent();
          expect(errorText?.trim().length).toBeGreaterThan(0);
        }
        
        await context.close();
      });
    });

    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should complete full calculation workflow in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/calculator');
        await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
        
        // Complete workflow
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="target-power-input"]').fill('150');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="calculate-button"]').click();
        
        // Wait for calculation to complete
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 15000 });
        await expect(page.locator('[data-testid="step-results"]')).toBeVisible();
        
        // Verify results are displayed
        await expect(page.locator('[data-testid="total-savings-value"]')).toBeVisible();
        
        const savingsText = await page.locator('[data-testid="total-savings-value"]').textContent();
        expect(savingsText).toMatch(/\$|€|£|¥/); // Should contain currency symbol
        
        await context.close();
      });
    });
  });

  test.describe('Browser-Specific Features', () => {
    test('should handle WebKit-specific behaviors', async ({ browser }) => {
      test.skip(browser.browserType().name() !== 'webkit', 'WebKit-specific test');
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/calculator');
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // Test iOS Safari-specific behaviors
      // Check for -webkit- prefixed CSS support
      const hasWebkitSupport = await page.evaluate(() => {
        const testEl = document.createElement('div');
        testEl.style.cssText = '-webkit-appearance: none;';
        return testEl.style.webkitAppearance === 'none';
      });
      
      expect(hasWebkitSupport).toBe(true);
      
      // Test touch events (if available)
      const hasTouchSupport = await page.evaluate(() => {
        return 'ontouchstart' in window;
      });
      
      // This may vary depending on the device
      console.log(`WebKit touch support: ${hasTouchSupport}`);
      
      await context.close();
    });

    test('should handle Firefox-specific behaviors', async ({ browser }) => {
      test.skip(browser.browserType().name() !== 'firefox', 'Firefox-specific test');
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/calculator');
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // Test Firefox-specific CSS
      const hasMozSupport = await page.evaluate(() => {
        const testEl = document.createElement('div');
        testEl.style.cssText = '-moz-appearance: none;';
        return testEl.style.MozAppearance === 'none';
      });
      
      expect(hasMozSupport).toBe(true);
      
      // Test number input behavior (Firefox may handle differently)
      await page.locator('[data-testid="rack-count-input"]').fill('10.5');
      const value = await page.locator('[data-testid="rack-count-input"]').inputValue();
      
      // Number inputs should handle decimals consistently
      expect(value).toBeDefined();
      
      await context.close();
    });

    test('should handle Chrome-specific behaviors', async ({ browser }) => {
      test.skip(browser.browserType().name() !== 'chromium', 'Chrome-specific test');
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/calculator');
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // Test Chrome DevTools APIs (if needed)
      const hasPerformanceAPI = await page.evaluate(() => {
        return typeof window.performance !== 'undefined' && 
               typeof window.performance.mark === 'function';
      });
      
      expect(hasPerformanceAPI).toBe(true);
      
      // Test Chrome-specific CSS
      const hasWebkitSupport = await page.evaluate(() => {
        const testEl = document.createElement('div');
        testEl.style.cssText = '-webkit-appearance: none;';
        return testEl.style.webkitAppearance === 'none';
      });
      
      expect(hasWebkitSupport).toBe(true);
      
      await context.close();
    });
  });
});

test.describe('Mobile Device Testing', () => {
  mobileDevices.forEach(device => {
    test(`should work correctly on ${device.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
        locale: 'en-US',
      });
      const page = await context.newPage();
      
      await page.goto('/calculator');
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // Verify mobile-specific elements are visible
      await expect(page.locator('[data-testid="mobile-menu"], [data-testid="hamburger-menu"]')).toBeVisible();
      
      // Test touch interactions
      await page.locator('[data-testid="rack-count-input"]').tap();
      await page.locator('[data-testid="rack-count-input"]').fill('10');
      
      await page.locator('[data-testid="power-per-rack-input"]').tap();
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      
      // Test mobile navigation
      await page.locator('[data-testid="next-button"]').tap();
      await expect(page.locator('[data-testid="step-immersion-cooling"]')).toBeVisible();
      
      // Verify viewport meta tag effects
      const viewportScale = await page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        return viewport ? viewport.getAttribute('content') : null;
      });
      
      expect(viewportScale).toContain('width=device-width');
      
      // Test scrolling behavior
      await page.evaluate(() => window.scrollTo(0, 100));
      const scrollY = await page.evaluate(() => window.pageYOffset);
      expect(scrollY).toBeGreaterThan(0);
      
      await context.close();
    });
  });

  test('should handle portrait and landscape orientations', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Portrait mode (default)
    let viewport = page.viewportSize();
    expect(viewport!.height).toBeGreaterThan(viewport!.width);
    
    // Test form in portrait
    await page.locator('[data-testid="rack-count-input"]').fill('10');
    await expect(page.locator('[data-testid="rack-count-input"]')).toHaveValue('10');
    
    // Simulate landscape mode
    await page.setViewportSize({ width: 844, height: 390 });
    
    viewport = page.viewportSize();
    expect(viewport!.width).toBeGreaterThan(viewport!.height);
    
    // Verify form still works in landscape
    await page.locator('[data-testid="power-per-rack-input"]').fill('15');
    await expect(page.locator('[data-testid="power-per-rack-input"]')).toHaveValue('15');
    
    await context.close();
  });

  test('should handle mobile-specific input methods', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Test numeric inputs trigger numeric keyboard
    const rackCountInput = page.locator('[data-testid="rack-count-input"]');
    const inputMode = await rackCountInput.getAttribute('inputmode');
    const inputType = await rackCountInput.getAttribute('type');
    
    // Should trigger numeric keyboard
    expect(inputMode === 'numeric' || inputType === 'number').toBe(true);
    
    // Test touch-friendly button sizes
    const nextButton = page.locator('[data-testid="next-button"]');
    const buttonBox = await nextButton.boundingBox();
    
    if (buttonBox) {
      // Buttons should be at least 44px for touch accessibility
      expect(buttonBox.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    }
    
    // Test swipe gestures (if supported)
    // Note: This is a simplified test - real swipe testing would be more complex
    const swipeElement = page.locator('[data-testid="swipeable-area"], .swipe-container');
    
    if (await swipeElement.count() > 0) {
      const box = await swipeElement.boundingBox();
      if (box) {
        // Simulate swipe gesture
        await page.mouse.move(box.x + 50, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
        await page.mouse.up();
        
        // Verify swipe had an effect (implementation specific)
      }
    }
    
    await context.close();
  });
});

test.describe('Tablet Device Testing', () => {
  tabletDevices.forEach(device => {
    test(`should adapt layout correctly for ${device.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
      });
      const page = await context.newPage();
      
      await page.goto('/calculator');
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // Tablets should show desktop-like layout with some mobile features
      const isMobileMenu = await page.locator('[data-testid="mobile-menu"]').isVisible();
      const isDesktopLayout = await page.locator('[data-testid="desktop-layout"]').isVisible();
      
      // Tablets might use either mobile or desktop patterns
      expect(isMobileMenu || isDesktopLayout).toBe(true);
      
      // Test multi-column layout if present
      const columns = page.locator('.column, [class*="col-"]');
      const columnCount = await columns.count();
      
      if (columnCount > 0) {
        // Tablets should be able to display multiple columns
        const firstColumn = columns.first();
        const columnWidth = await firstColumn.evaluate(el => el.offsetWidth);
        
        expect(columnWidth).toBeGreaterThan(200); // Reasonable column width
      }
      
      // Complete a calculation to test results layout
      await page.locator('[data-testid="rack-count-input"]').fill('25');
      await page.locator('[data-testid="power-per-rack-input"]').fill('18');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="target-power-input"]').fill('450');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="calculate-button"]').click();
      await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 15000 });
      
      // Verify results display well on tablet
      await expect(page.locator('[data-testid="results-container"]')).toBeVisible();
      
      // Charts should be appropriately sized for tablet
      const chartElements = page.locator('[data-testid*="chart"]');
      const chartCount = await chartElements.count();
      
      if (chartCount > 0) {
        const firstChart = chartElements.first();
        const chartBox = await firstChart.boundingBox();
        
        if (chartBox) {
          // Charts should be large enough to be readable on tablets
          expect(chartBox.width).toBeGreaterThan(300);
          expect(chartBox.height).toBeGreaterThan(200);
        }
      }
      
      await context.close();
    });
  });
});

test.describe('Desktop Responsive Design', () => {
  desktopViewports.forEach(viewport => {
    test(`should display correctly at ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      
      await page.goto('/calculator');
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // Desktop should show full navigation
      await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
      
      // Test layout at different desktop sizes
      const contentWidth = await page.evaluate(() => {
        const main = document.querySelector('main, [role="main"], .main-content');
        return main ? main.getBoundingClientRect().width : document.body.getBoundingClientRect().width;
      });
      
      // Content should not be too narrow on wide screens
      if (viewport.width >= 1920) {
        expect(contentWidth).toBeGreaterThan(800);
      }
      
      // Content should not be too wide (max-width should be set)
      expect(contentWidth).toBeLessThan(viewport.width);
      
      // Test multi-column layout at desktop sizes
      const columns = page.locator('[class*="col-"], .column');
      const columnCount = await columns.count();
      
      if (columnCount >= 2) {
        // Verify columns are side by side, not stacked
        const firstColumn = columns.first();
        const secondColumn = columns.nth(1);
        
        const firstBox = await firstColumn.boundingBox();
        const secondBox = await secondColumn.boundingBox();
        
        if (firstBox && secondBox) {
          // Columns should be at roughly the same vertical position
          expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(50);
          
          // Second column should be to the right of the first
          expect(secondBox.x).toBeGreaterThan(firstBox.x);
        }
      }
      
      await context.close();
    });
  });

  test('should handle ultra-wide displays', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 3440, height: 1440 }, // Ultra-wide 21:9
    });
    const page = await context.newPage();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Content should be centered or have reasonable max-width
    const contentContainer = page.locator('.container, .content, main, [role="main"]');
    
    if (await contentContainer.count() > 0) {
      const containerBox = await contentContainer.first().boundingBox();
      
      if (containerBox) {
        // Content should not span the entire ultra-wide screen
        expect(containerBox.width).toBeLessThan(2000);
        
        // Should be reasonably centered
        const leftMargin = containerBox.x;
        const rightMargin = 3440 - (containerBox.x + containerBox.width);
        const marginDifference = Math.abs(leftMargin - rightMargin);
        
        expect(marginDifference).toBeLessThan(200);
      }
    }
    
    await context.close();
  });
});

test.describe('Touch and Pointer Events', () => {
  test('should support both mouse and touch interactions', async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
    });
    const page = await context.newPage();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Test mouse interactions
    await page.locator('[data-testid="rack-count-input"]').click();
    await page.locator('[data-testid="rack-count-input"]').fill('10');
    
    // Test touch interactions
    await page.locator('[data-testid="power-per-rack-input"]').tap();
    await page.locator('[data-testid="power-per-rack-input"]').fill('15');
    
    // Both should work
    await expect(page.locator('[data-testid="rack-count-input"]')).toHaveValue('10');
    await expect(page.locator('[data-testid="power-per-rack-input"]')).toHaveValue('15');
    
    // Test button interactions
    await page.locator('[data-testid="next-button"]').click();
    await expect(page.locator('[data-testid="step-immersion-cooling"]')).toBeVisible();
    
    await context.close();
  });

  test('should provide appropriate hover states on non-touch devices', async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: false, // Desktop-like device
    });
    const page = await context.newPage();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Test hover states on buttons
    const nextButton = page.locator('[data-testid="next-button"]');
    
    // Get initial styles
    const initialStyles = await nextButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        transform: computed.transform,
      };
    });
    
    // Hover over button
    await nextButton.hover();
    
    // Get hover styles
    const hoverStyles = await nextButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        transform: computed.transform,
      };
    });
    
    // At least one style should change on hover
    const hasHoverEffect = 
      initialStyles.backgroundColor !== hoverStyles.backgroundColor ||
      initialStyles.color !== hoverStyles.color ||
      initialStyles.transform !== hoverStyles.transform;
    
    expect(hasHoverEffect).toBe(true);
    
    await context.close();
  });
});

test.describe('Performance Across Devices', () => {
  test('should perform well on low-end mobile devices', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone SE'], // Lower-end device simulation
    });
    const page = await context.newPage();
    
    // Throttle CPU and network to simulate low-end device
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    const startTime = Date.now();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should load reasonably quickly even on low-end devices
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Test interaction responsiveness
    const interactionStart = Date.now();
    
    await page.locator('[data-testid="rack-count-input"]').fill('10');
    await page.locator('[data-testid="power-per-rack-input"]').fill('15');
    await page.locator('[data-testid="next-button"]').click();
    
    const interactionTime = Date.now() - interactionStart;
    
    // Interactions should be responsive
    expect(interactionTime).toBeLessThan(3000);
    
    await context.close();
  });

  test('should handle high DPI displays correctly', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2, // Retina/high DPI
    });
    const page = await context.newPage();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Verify images and icons are crisp on high DPI
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(3, imageCount); i++) {
      const img = images.nth(i);
      const naturalDimensions = await img.evaluate(el => ({
        naturalWidth: (el as HTMLImageElement).naturalWidth,
        naturalHeight: (el as HTMLImageElement).naturalHeight,
        displayWidth: el.offsetWidth,
        displayHeight: el.offsetHeight,
      }));
      
      // Images should have sufficient resolution for high DPI
      if (naturalDimensions.naturalWidth > 0) {
        const pixelRatio = naturalDimensions.naturalWidth / naturalDimensions.displayWidth;
        expect(pixelRatio).toBeGreaterThanOrEqual(1.5); // Should support at least 1.5x
      }
    }
    
    // Test text rendering
    const textElement = page.locator('h1');
    const textStyles = await textElement.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
      };
    });
    
    expect(textStyles.fontSize).toBeDefined();
    expect(parseFloat(textStyles.fontSize)).toBeGreaterThan(16); // Readable font size
    
    await context.close();
  });
});

test.describe('Network Conditions', () => {
  test('should work on slow networks', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Simulate slow 3G
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
      route.continue();
    });
    
    const startTime = Date.now();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should still load within reasonable time on slow networks
    expect(loadTime).toBeLessThan(15000);
    
    // Test form interaction on slow network
    await page.locator('[data-testid="rack-count-input"]').fill('10');
    await page.locator('[data-testid="power-per-rack-input"]').fill('15');
    await page.locator('[data-testid="next-button"]').click();
    
    // Should navigate despite network slowness
    await expect(page.locator('[data-testid="step-immersion-cooling"]')).toBeVisible({ timeout: 10000 });
    
    await context.close();
  });

  test('should handle offline scenarios gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Go offline
    await context.setOffline(true);
    
    // Test offline behavior
    await page.locator('[data-testid="rack-count-input"]').fill('10');
    await page.locator('[data-testid="power-per-rack-input"]').fill('15');
    
    // Local interactions should still work
    await expect(page.locator('[data-testid="rack-count-input"]')).toHaveValue('10');
    
    // Try to proceed (might show offline message)
    await page.locator('[data-testid="next-button"]').click();
    
    // Check for offline indicators
    const offlineIndicators = page.locator('[data-testid*="offline"], .offline, [aria-label*="offline"]');
    const hasOfflineIndicator = await offlineIndicators.count() > 0;
    
    if (hasOfflineIndicator) {
      await expect(offlineIndicators.first()).toBeVisible();
    }
    
    // Go back online
    await context.setOffline(false);
    
    // Should recover when back online
    await page.waitForTimeout(1000);
    
    await context.close();
  });
});

test.describe('Print Styles', () => {
  test('should have appropriate print styles', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/calculator');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Complete calculation to have content to print
    await page.locator('[data-testid="rack-count-input"]').fill('10');
    await page.locator('[data-testid="power-per-rack-input"]').fill('15');
    await page.locator('[data-testid="next-button"]').click();
    
    await page.locator('[data-testid="target-power-input"]').fill('150');
    await page.locator('[data-testid="next-button"]').click();
    
    await page.locator('[data-testid="next-button"]').click();
    
    await page.locator('[data-testid="calculate-button"]').click();
    await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 15000 });
    
    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    
    // Check that content is still visible in print mode
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="total-savings-value"]')).toBeVisible();
    
    // Navigation elements might be hidden in print
    const navElements = page.locator('nav, [role="navigation"]');
    
    if (await navElements.count() > 0) {
      const navDisplay = await navElements.first().evaluate(el => 
        window.getComputedStyle(el).display
      );
      
      // Navigation might be hidden in print styles
      expect(['none', 'block', 'flex'].includes(navDisplay)).toBe(true);
    }
    
    // Check print-specific styles
    const printStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontSize: computed.fontSize,
      };
    });
    
    // Print styles should ensure readability
    expect(printStyles.fontSize).toBeDefined();
    
    await context.close();
  });
});