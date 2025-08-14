/**
 * End-to-End tests for complete calculator workflow
 * Tests the full user journey from configuration to results
 */

import { test, expect, Page } from '@playwright/test';

test.describe('TCO Calculator E2E Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/calculator');
    
    // Wait for the application to load
    await expect(page.locator('h1')).toContainText('TCO Calculator');
  });

  test.describe('Complete Calculation Workflow', () => {
    test('should complete full calculation workflow successfully', async () => {
      // Step 1: Configure Air Cooling
      await test.step('Configure Air Cooling', async () => {
        // Verify we're on the air cooling step
        await expect(page.locator('[data-testid="step-air-cooling"]')).toBeVisible();
        
        // Select rack count method (should be default)
        await page.locator('input[value="rack_count"]').check();
        
        // Fill in rack configuration
        await page.locator('[data-testid="rack-count-input"]').fill('20');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        
        // Select rack type
        await page.locator('input[value="42U_STANDARD"]').check();
        
        // Verify preview updates
        await expect(page.locator('[data-testid="preview-total-power"]')).toContainText('300');
        await expect(page.locator('[data-testid="preview-pue"]')).toBeVisible();
        
        // Adjust advanced settings
        await page.locator('[data-testid="hvac-efficiency-slider"]').fill('0.90');
        
        // Proceed to next step
        await page.locator('[data-testid="next-button"]').click();
      });

      // Step 2: Configure Immersion Cooling
      await test.step('Configure Immersion Cooling', async () => {
        // Verify we're on the immersion cooling step
        await expect(page.locator('[data-testid="step-immersion-cooling"]')).toBeVisible();
        
        // Use auto-optimize method
        await page.locator('input[value="auto_optimize"]').check();
        
        // Set target power
        await page.locator('[data-testid="target-power-input"]').fill('300');
        
        // Run optimization
        await page.locator('[data-testid="optimize-button"]').click();
        
        // Wait for optimization results
        await expect(page.locator('[data-testid="optimization-results"]')).toBeVisible();
        
        // Apply optimization
        await page.locator('[data-testid="apply-optimization-button"]').click();
        
        // Select coolant type
        await page.locator('input[value="synthetic"]').check();
        
        // Verify preview updates
        await expect(page.locator('[data-testid="preview-total-tanks"]')).toBeVisible();
        await expect(page.locator('[data-testid="preview-pue"]')).toContainText('1.0');
        
        // Proceed to next step
        await page.locator('[data-testid="next-button"]').click();
      });

      // Step 3: Configure Financial Parameters
      await test.step('Configure Financial Parameters', async () => {
        // Verify we're on the financial step
        await expect(page.locator('[data-testid="step-financial"]')).toBeVisible();
        
        // Select region
        await page.locator('[data-testid="region-select"]').selectOption('US');
        
        // Verify currency auto-updates
        await expect(page.locator('[data-testid="currency-select"]')).toHaveValue('USD');
        
        // Set analysis period
        await page.locator('[data-testid="analysis-years-input"]').fill('5');
        
        // Set discount rate
        await page.locator('[data-testid="discount-rate-input"]').fill('8');
        
        // Enable custom rates
        await page.locator('[data-testid="use-custom-rates-switch"]').check();
        
        // Set custom energy cost
        await page.locator('[data-testid="custom-energy-cost-input"]').fill('0.12');
        
        // Set custom labor cost
        await page.locator('[data-testid="custom-labor-cost-input"]').fill('75');
        
        // Adjust escalation rates
        await page.locator('[data-testid="energy-escalation-slider"]').fill('3');
        await page.locator('[data-testid="maintenance-escalation-slider"]').fill('2.5');
        
        // Verify NPV preview
        await expect(page.locator('[data-testid="npv-preview"]')).toBeVisible();
        
        // Proceed to next step
        await page.locator('[data-testid="next-button"]').click();
      });

      // Step 4: Review Configuration
      await test.step('Review Configuration', async () => {
        // Verify we're on the review step
        await expect(page.locator('[data-testid="step-review"]')).toBeVisible();
        
        // Verify all configuration sections are displayed
        await expect(page.locator('[data-testid="air-cooling-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="immersion-cooling-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="financial-summary"]')).toBeVisible();
        
        // Verify configuration values
        await expect(page.locator('[data-testid="air-cooling-racks"]')).toContainText('20');
        await expect(page.locator('[data-testid="immersion-target-power"]')).toContainText('300');
        await expect(page.locator('[data-testid="analysis-years"]')).toContainText('5');
        
        // Check for validation warnings if any
        const warnings = page.locator('[data-testid="validation-warnings"]');
        if (await warnings.isVisible()) {
          await expect(warnings).toBeVisible();
        }
        
        // Trigger calculation
        await page.locator('[data-testid="calculate-button"]').click();
        
        // Wait for calculation to complete
        await expect(page.locator('[data-testid="calculation-loading"]')).toBeVisible();
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
      });

      // Step 5: View Results
      await test.step('View Results', async () => {
        // Verify we're on the results step
        await expect(page.locator('[data-testid="step-results"]')).toBeVisible();
        
        // Verify main summary cards
        await expect(page.locator('[data-testid="total-savings-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="roi-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="payback-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="energy-efficiency-card"]')).toBeVisible();
        
        // Verify savings are positive
        const totalSavings = await page.locator('[data-testid="total-savings-value"]').textContent();
        expect(totalSavings).toMatch(/^\$[\d,]+/);
        
        // Verify ROI is positive
        const roi = await page.locator('[data-testid="roi-value"]').textContent();
        expect(roi).toMatch(/^\d+\.\d+%$/);
        
        // Check charts are loaded
        await expect(page.locator('[data-testid="tco-progression-chart"]')).toBeVisible();
        await expect(page.locator('[data-testid="cost-categories-chart"]')).toBeVisible();
        await expect(page.locator('[data-testid="pue-comparison-chart"]')).toBeVisible();
        
        // Test tabs navigation
        await page.locator('[data-testid="tab-charts"]').click();
        await expect(page.locator('[data-testid="charts-content"]')).toBeVisible();
        
        await page.locator('[data-testid="tab-environmental"]').click();
        await expect(page.locator('[data-testid="environmental-content"]')).toBeVisible();
        
        await page.locator('[data-testid="tab-breakdown"]').click();
        await expect(page.locator('[data-testid="breakdown-content"]')).toBeVisible();
        
        // Return to summary
        await page.locator('[data-testid="tab-summary"]').click();
        await expect(page.locator('[data-testid="summary-content"]')).toBeVisible();
      });
    });

    test('should handle different configuration scenarios', async () => {
      // Test scenario with manual immersion cooling configuration
      await test.step('Configure with manual immersion cooling', async () => {
        // Configure air cooling
        await page.locator('input[value="rack_count"]').check();
        await page.locator('[data-testid="rack-count-input"]').fill('50');
        await page.locator('[data-testid="power-per-rack-input"]').fill('20');
        await page.locator('[data-testid="next-button"]').click();
        
        // Configure immersion cooling manually
        await page.locator('input[value="manual_config"]').check();
        
        // Add tank configurations
        await page.locator('[data-testid="add-tank-button"]').click();
        
        // Configure first tank
        await page.locator('[data-testid="tank-0-size-select"]').selectOption('23U');
        await page.locator('[data-testid="tank-0-quantity-input"]').fill('10');
        await page.locator('[data-testid="tank-0-power-density-input"]').fill('2.0');
        
        // Add second tank
        await page.locator('[data-testid="add-tank-button"]').click();
        await page.locator('[data-testid="tank-1-size-select"]').selectOption('20U');
        await page.locator('[data-testid="tank-1-quantity-input"]').fill('5');
        await page.locator('[data-testid="tank-1-power-density-input"]').fill('2.0');
        
        // Verify total power calculation
        await expect(page.locator('[data-testid="preview-total-power"]')).toBeVisible();
        
        await page.locator('[data-testid="next-button"]').click();
        
        // Configure financial with different region
        await page.locator('[data-testid="region-select"]').selectOption('EU');
        await expect(page.locator('[data-testid="currency-select"]')).toHaveValue('EUR');
        
        await page.locator('[data-testid="analysis-years-input"]').fill('7');
        await page.locator('[data-testid="next-button"]').click();
        
        // Review and calculate
        await page.locator('[data-testid="calculate-button"]').click();
        
        // Wait for results
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
        await expect(page.locator('[data-testid="step-results"]')).toBeVisible();
        
        // Verify results are in EUR
        const savings = await page.locator('[data-testid="total-savings-value"]').textContent();
        expect(savings).toMatch(/€[\d,]+/);
      });
    });

    test('should validate input constraints and show errors', async () => {
      await test.step('Test validation errors', async () => {
        // Try invalid rack count
        await page.locator('[data-testid="rack-count-input"]').fill('0');
        await expect(page.locator('[data-testid="rack-count-error"]')).toBeVisible();
        
        // Try invalid power value
        await page.locator('[data-testid="power-per-rack-input"]').fill('100');
        await expect(page.locator('[data-testid="power-per-rack-error"]')).toBeVisible();
        
        // Verify next button is disabled
        await expect(page.locator('[data-testid="next-button"]')).toBeDisabled();
        
        // Fix validation errors
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        
        // Verify errors are cleared
        await expect(page.locator('[data-testid="rack-count-error"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="power-per-rack-error"]')).not.toBeVisible();
        
        // Verify next button is enabled
        await expect(page.locator('[data-testid="next-button"]')).toBeEnabled();
      });
    });
  });

  test.describe('Report Generation', () => {
    test('should generate and download PDF report', async () => {
      // Complete basic configuration
      await test.step('Complete configuration', async () => {
        // Quick configuration
        await page.locator('[data-testid="rack-count-input"]').fill('10');
        await page.locator('[data-testid="power-per-rack-input"]').fill('15');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="target-power-input"]').fill('150');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="next-button"]').click(); // Skip financial with defaults
        
        await page.locator('[data-testid="calculate-button"]').click();
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
      });

      await test.step('Generate PDF report', async () => {
        // Click export PDF button
        const downloadPromise = page.waitForEvent('download');
        await page.locator('[data-testid="export-pdf-button"]').click();
        
        // Wait for download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/tco-analysis.*\.pdf$/);
        
        // Verify file is downloaded
        const path = await download.path();
        expect(path).toBeTruthy();
      });
    });

    test('should generate and download Excel report', async () => {
      // Complete basic configuration
      await test.step('Complete configuration', async () => {
        await page.locator('[data-testid="rack-count-input"]').fill('20');
        await page.locator('[data-testid="power-per-rack-input"]').fill('18');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="target-power-input"]').fill('360');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="calculate-button"]').click();
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
      });

      await test.step('Generate Excel report', async () => {
        const downloadPromise = page.waitForEvent('download');
        await page.locator('[data-testid="export-excel-button"]').click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/tco-analysis.*\.xlsx$/);
      });
    });

    test('should share calculation results', async () => {
      // Complete calculation
      await test.step('Complete calculation', async () => {
        await page.locator('[data-testid="rack-count-input"]').fill('15');
        await page.locator('[data-testid="power-per-rack-input"]').fill('12');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="target-power-input"]').fill('180');
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="next-button"]').click();
        
        await page.locator('[data-testid="calculate-button"]').click();
        await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 10000 });
      });

      await test.step('Share results', async () => {
        await page.locator('[data-testid="share-button"]').click();
        
        // Verify share dialog opens
        await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();
        
        // Verify share URL is generated
        const shareUrl = page.locator('[data-testid="share-url-input"]');
        await expect(shareUrl).toBeVisible();
        
        const urlValue = await shareUrl.inputValue();
        expect(urlValue).toMatch(/\/shared\/[a-f0-9-]+$/);
        
        // Copy to clipboard
        await page.locator('[data-testid="copy-url-button"]').click();
        
        // Verify copy feedback
        await expect(page.locator('[data-testid="copy-success-message"]')).toBeVisible();
        
        // Close dialog
        await page.locator('[data-testid="close-share-dialog"]').click();
        await expect(page.locator('[data-testid="share-dialog"]')).not.toBeVisible();
      });
    });
  });

  test.describe('Accessibility and User Experience', () => {
    test('should support keyboard navigation', async () => {
      // Test tab navigation through form
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'rack-count-radio');
      
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'total-power-radio');
      
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'rack-count-input');
      
      // Test form submission with Enter key
      await page.locator('[data-testid="rack-count-input"]').fill('10');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Should trigger next step
      
      await expect(page.locator('[data-testid="step-immersion-cooling"]')).toBeVisible();
    });

    test('should provide screen reader support', async () => {
      // Verify ARIA labels are present
      await expect(page.locator('[aria-label*="Air cooling configuration"]')).toBeVisible();
      await expect(page.locator('[aria-describedby]')).toHaveCount.greaterThan(0);
      
      // Verify form validation is announced
      await page.locator('[data-testid="rack-count-input"]').fill('0');
      const errorElement = page.locator('[data-testid="rack-count-error"]');
      await expect(errorElement).toHaveAttribute('role', 'alert');
    });

    test('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify responsive design
      await expect(page.locator('[data-testid="mobile-stepper"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-stepper"]')).not.toBeVisible();
      
      // Test mobile-specific interactions
      await page.locator('[data-testid="rack-count-input"]').fill('10');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      
      // Mobile next button should work
      await page.locator('[data-testid="mobile-next-button"]').click();
      await expect(page.locator('[data-testid="step-immersion-cooling"]')).toBeVisible();
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should handle calculation timeouts gracefully', async () => {
      // Configure complex scenario that might take longer
      await page.locator('[data-testid="rack-count-input"]').fill('1000');
      await page.locator('[data-testid="power-per-rack-input"]').fill('25');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="target-power-input"]').fill('25000');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="analysis-years-input"]').fill('10');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="calculate-button"]').click();
      
      // Should either complete successfully or show appropriate error
      await page.waitForSelector('[data-testid="calculation-loading"], [data-testid="calculation-error"], [data-testid="step-results"]', { timeout: 30000 });
      
      const isError = await page.locator('[data-testid="calculation-error"]').isVisible();
      if (isError) {
        await expect(page.locator('[data-testid="retry-calculation-button"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="step-results"]')).toBeVisible();
      }
    });

    test('should handle network errors during calculation', async () => {
      // Intercept API calls to simulate network error
      await page.route('**/api/v1/calculations/calculate', route => {
        route.abort('failed');
      });
      
      // Complete configuration
      await page.locator('[data-testid="rack-count-input"]').fill('10');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="target-power-input"]').fill('150');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="calculate-button"]').click();
      
      // Should show error message
      await expect(page.locator('[data-testid="calculation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
      
      // Should provide retry option
      await expect(page.locator('[data-testid="retry-calculation-button"]')).toBeVisible();
    });

    test('should complete calculations within performance thresholds', async () => {
      const startTime = Date.now();
      
      // Standard configuration
      await page.locator('[data-testid="rack-count-input"]').fill('25');
      await page.locator('[data-testid="power-per-rack-input"]').fill('15');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="target-power-input"]').fill('375');
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="next-button"]').click();
      
      await page.locator('[data-testid="calculate-button"]').click();
      
      // Wait for calculation to complete
      await expect(page.locator('[data-testid="calculation-loading"]')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="step-results"]')).toBeVisible();
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within 5 seconds total (including UI interactions)
      expect(totalTime).toBeLessThan(5000);
      
      // Charts should render quickly
      const chartStartTime = Date.now();
      await expect(page.locator('[data-testid="tco-progression-chart"]')).toBeVisible();
      const chartEndTime = Date.now();
      
      expect(chartEndTime - chartStartTime).toBeLessThan(1000);
    });
  });

  test.describe('Data Persistence and State Management', () => {
    test('should preserve form data when navigating between steps', async () => {
      // Fill air cooling form
      await page.locator('[data-testid="rack-count-input"]').fill('30');
      await page.locator('[data-testid="power-per-rack-input"]').fill('18');
      await page.locator('[data-testid="hvac-efficiency-slider"]').fill('0.88');
      await page.locator('[data-testid="next-button"]').click();
      
      // Fill immersion cooling form
      await page.locator('[data-testid="target-power-input"]').fill('540');
      await page.locator('input[value="mineral_oil"]').check();
      await page.locator('[data-testid="next-button"]').click();
      
      // Fill financial form
      await page.locator('[data-testid="analysis-years-input"]').fill('7');
      await page.locator('[data-testid="discount-rate-input"]').fill('6');
      
      // Navigate back to air cooling
      await page.locator('[data-testid="step-air-cooling-nav"]').click();
      
      // Verify data is preserved
      await expect(page.locator('[data-testid="rack-count-input"]')).toHaveValue('30');
      await expect(page.locator('[data-testid="power-per-rack-input"]')).toHaveValue('18');
      
      // Navigate to immersion cooling
      await page.locator('[data-testid="step-immersion-cooling-nav"]').click();
      
      // Verify data is preserved
      await expect(page.locator('[data-testid="target-power-input"]')).toHaveValue('540');
      await expect(page.locator('input[value="mineral_oil"]')).toBeChecked();
      
      // Navigate to financial
      await page.locator('[data-testid="step-financial-nav"]').click();
      
      // Verify data is preserved
      await expect(page.locator('[data-testid="analysis-years-input"]')).toHaveValue('7');
      await expect(page.locator('[data-testid="discount-rate-input"]')).toHaveValue('6');
    });

    test('should handle browser refresh gracefully', async () => {
      // Fill some form data
      await page.locator('[data-testid="rack-count-input"]').fill('15');
      await page.locator('[data-testid="power-per-rack-input"]').fill('20');
      
      // Refresh the page
      await page.reload();
      
      // Should show initial state (data not persisted across refresh in this version)
      await expect(page.locator('[data-testid="step-air-cooling"]')).toBeVisible();
      
      // Form should be reset to defaults
      await expect(page.locator('[data-testid="rack-count-input"]')).toHaveValue('');
    });
  });
});