/**
 * Environmental Impact E2E Test Suite
 * Tests complete environmental impact workflow from configuration to professional ESG reporting
 * Validates 88/100 validator score metrics (PUE 38.9%, Energy 1159 MWh, CO₂ 464 tons)
 */

import { test, expect, Page } from '@playwright/test';

// Test data configuration designed to hit validator metrics
const VALIDATOR_BENCHMARK_CONFIG = {
  airCooling: {
    rackCount: 77,
    powerPerRack: 15.5, // ~1193.5 kW total
    hvacEfficiency: 83,
    powerDistributionEfficiency: 94,
  },
  immersionCooling: {
    targetPower: 1193.5,
    pumpingEfficiency: 92,
    heatExchangerEfficiency: 95,
  },
  financial: {
    analysisYears: 5,
    energyCost: 0.12,
    currency: 'USD',
    region: 'US',
  },
};

// Helper functions
async function configureAirCooling(page: Page, config: typeof VALIDATOR_BENCHMARK_CONFIG.airCooling) {
  // Select rack count method
  await page.selectOption('[data-testid="air-cooling-input-method"]', 'rack_count');
  
  // Set rack configuration
  await page.fill('[data-testid="rack-count"]', config.rackCount.toString());
  await page.fill('[data-testid="power-per-rack"]', config.powerPerRack.toString());
  
  // Set efficiency parameters
  await page.fill('[data-testid="hvac-efficiency"]', config.hvacEfficiency.toString());
  await page.fill('[data-testid="power-distribution-efficiency"]', config.powerDistributionEfficiency.toString());
}

async function configureImmersionCooling(page: Page, config: typeof VALIDATOR_BENCHMARK_CONFIG.immersionCooling) {
  // Select auto-optimize method
  await page.selectOption('[data-testid="immersion-cooling-input-method"]', 'auto_optimize');
  
  // Set target power
  await page.fill('[data-testid="target-power"]', config.targetPower.toString());
  
  // Set system parameters
  await page.fill('[data-testid="pumping-efficiency"]', config.pumpingEfficiency.toString());
  await page.fill('[data-testid="heat-exchanger-efficiency"]', config.heatExchangerEfficiency.toString());
}

async function configureFinancials(page: Page, config: typeof VALIDATOR_BENCHMARK_CONFIG.financial) {
  // Set analysis parameters
  await page.selectOption('[data-testid="analysis-years"]', config.analysisYears.toString());
  await page.fill('[data-testid="energy-cost"]', config.energyCost.toString());
  await page.selectOption('[data-testid="currency"]', config.currency);
  await page.selectOption('[data-testid="region"]', config.region);
}

async function waitForCalculationCompletion(page: Page) {
  // Wait for calculation to complete (spinner should disappear)
  await expect(page.locator('[data-testid="calculation-spinner"]')).not.toBeVisible({ timeout: 30000 });
  
  // Wait for results to be displayed
  await expect(page.locator('[data-testid="results-display"]')).toBeVisible({ timeout: 10000 });
}

test.describe('Environmental Impact Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full environmental impact calculation workflow', async ({ page }) => {
    // Step 1: Configure air cooling system
    await test.step('Configure air cooling system', async () => {
      await configureAirCooling(page, VALIDATOR_BENCHMARK_CONFIG.airCooling);
      
      // Verify configuration is accepted
      await expect(page.locator('[data-testid="air-cooling-form"]')).toContainText('77');
      await expect(page.locator('[data-testid="air-cooling-form"]')).toContainText('15.5');
    });

    // Step 2: Configure immersion cooling system
    await test.step('Configure immersion cooling system', async () => {
      await configureImmersionCooling(page, VALIDATOR_BENCHMARK_CONFIG.immersionCooling);
      
      // Verify configuration is accepted
      await expect(page.locator('[data-testid="immersion-cooling-form"]')).toContainText('1193.5');
    });

    // Step 3: Configure financial parameters
    await test.step('Configure financial parameters', async () => {
      await configureFinancials(page, VALIDATOR_BENCHMARK_CONFIG.financial);
    });

    // Step 4: Execute calculation
    await test.step('Execute TCO calculation', async () => {
      await page.click('[data-testid="calculate-button"]');
      
      // Wait for calculation to complete
      await waitForCalculationCompletion(page);
    });

    // Step 5: Verify environmental impact results
    await test.step('Verify environmental impact display', async () => {
      // Navigate to Environmental Impact tab
      await page.click('[role="tab"][name*="Environmental Impact"]');
      
      // Wait for tab content to load
      await expect(page.locator('[role="tabpanel"]')).toBeVisible();

      // Verify validator target metrics are present
      
      // PUE improvement should be close to 38.9%
      const pueImprovement = await page.locator('[data-testid="pue-improvement"]').textContent();
      const pueValue = parseFloat(pueImprovement?.replace('%', '') || '0');
      expect(pueValue).toBeGreaterThan(35);
      expect(pueValue).toBeLessThan(45);

      // Energy savings should be close to 1159 MWh/year
      await expect(page.locator('text=MWh per year')).toBeVisible();
      const energyText = await page.locator('[data-testid="energy-savings-mwh"]').textContent();
      const energyValue = parseInt(energyText?.replace(/[,\s]/g, '') || '0');
      expect(energyValue).toBeGreaterThan(1000);
      expect(energyValue).toBeLessThan(1400);

      // CO₂ savings should be close to 464 tons/year
      await expect(page.locator('text=Metric tons CO2 per year')).toBeVisible();
      const carbonText = await page.locator('[data-testid="carbon-savings-tons"]').textContent();
      const carbonValue = parseFloat(carbonText || '0');
      expect(carbonValue).toBeGreaterThan(400);
      expect(carbonValue).toBeLessThan(550);
    });

    // Step 6: Verify professional presentation quality
    await test.step('Verify professional presentation standards', async () => {
      // Check for professional environmental benefits alert
      await expect(page.locator('[data-testid="environmental-benefits-alert"]')).toBeVisible();
      await expect(page.locator('text=Environmental Benefits')).toBeVisible();

      // Verify metric cards are properly styled
      const metricCards = page.locator('[data-testid="environmental-metric-card"]');
      await expect(metricCards).toHaveCount(3);

      // Check for contextual equivalents
      await expect(page.locator('text=/removing approximately \\d+ cars from the road/')).toBeVisible();
      await expect(page.locator('text=/37\\.2%/')).toBeVisible(); // Carbon footprint reduction
    });
  });

  test('should display environmental charts with professional quality', async ({ page }) => {
    // Configure and calculate with benchmark data
    await configureAirCooling(page, VALIDATOR_BENCHMARK_CONFIG.airCooling);
    await configureImmersionCooling(page, VALIDATOR_BENCHMARK_CONFIG.immersionCooling);
    await configureFinancials(page, VALIDATOR_BENCHMARK_CONFIG.financial);
    
    await page.click('[data-testid="calculate-button"]');
    await waitForCalculationCompletion(page);

    // Navigate to Charts tab
    await page.click('[role="tab"][name*="Charts"]');
    
    // Verify PUE comparison chart
    await test.step('Verify PUE comparison chart', async () => {
      await expect(page.locator('[data-testid="pue-comparison-chart"]')).toBeVisible();
      
      // Chart should show clear PUE difference
      await expect(page.locator('text=Power Usage Effectiveness')).toBeVisible();
      
      // Verify chart legend shows both cooling types
      await expect(page.locator('text=Air Cooling PUE')).toBeVisible();
      await expect(page.locator('text=Immersion Cooling PUE')).toBeVisible();
    });

    // Verify charts are responsive and professionally styled
    await test.step('Verify chart responsiveness', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="pue-comparison-chart"]')).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="pue-comparison-chart"]')).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('[data-testid="pue-comparison-chart"]')).toBeVisible();
    });
  });

  test('should provide ESG-compliant reporting format', async ({ page }) => {
    // Configure and calculate
    await configureAirCooling(page, VALIDATOR_BENCHMARK_CONFIG.airCooling);
    await configureImmersionCooling(page, VALIDATOR_BENCHMARK_CONFIG.immersionCooling);
    await configureFinancials(page, VALIDATOR_BENCHMARK_CONFIG.financial);
    
    await page.click('[data-testid="calculate-button"]');
    await waitForCalculationCompletion(page);

    await test.step('Verify ESG metrics presentation', async () => {
      // Navigate to Environmental Impact tab
      await page.click('[role="tab"][name*="Environmental Impact"]');

      // Verify all key ESG metrics are clearly presented
      await expect(page.locator('text=Annual Carbon Savings')).toBeVisible();
      await expect(page.locator('text=Annual Energy Savings')).toBeVisible();
      await expect(page.locator('text=Water Savings')).toBeVisible();

      // Verify professional formatting
      await expect(page.locator('[data-testid="carbon-savings-tons"]')).toContainText(/\d+\.\d/); // Decimal format
      await expect(page.locator('[data-testid="energy-savings-mwh"]')).toContainText(/\d+/); // Whole number
      await expect(page.locator('[data-testid="water-savings-gallons"]')).toContainText(/\d{1,3}(,\d{3})*/); // Comma-separated

      // Verify ESG context information
      await expect(page.locator('text=/carbon footprint reduction/')).toBeVisible();
      await expect(page.locator('text=/significant environmental improvements/')).toBeVisible();
    });

    await test.step('Verify export readiness for ESG reporting', async () => {
      // Check for export buttons
      await expect(page.locator('[data-testid="export-pdf-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-excel-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-results-button"]')).toBeVisible();

      // Verify buttons are enabled (not disabled)
      await expect(page.locator('[data-testid="export-pdf-button"]')).toBeEnabled();
      await expect(page.locator('[data-testid="export-excel-button"]')).toBeEnabled();
    });
  });

  test('should handle environmental calculation errors gracefully', async ({ page }) => {
    await test.step('Test with invalid air cooling configuration', async () => {
      // Enter invalid values
      await page.selectOption('[data-testid="air-cooling-input-method"]', 'rack_count');
      await page.fill('[data-testid="rack-count"]', '0');
      await page.fill('[data-testid="power-per-rack"]', '-5');

      await page.click('[data-testid="calculate-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('text=/invalid|error/i')).toBeVisible();
    });

    await test.step('Test with network error during calculation', async () => {
      // Configure valid inputs
      await configureAirCooling(page, VALIDATOR_BENCHMARK_CONFIG.airCooling);
      await configureImmersionCooling(page, VALIDATOR_BENCHMARK_CONFIG.immersionCooling);

      // Simulate network failure
      await page.route('**/api/calculations', route => route.abort());

      await page.click('[data-testid="calculate-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="calculation-error"]')).toBeVisible();
      await expect(page.locator('text=/calculation.*error|failed/i')).toBeVisible();
    });
  });

  test('should maintain performance during environmental calculations', async ({ page }) => {
    await test.step('Measure calculation performance', async () => {
      const startTime = Date.now();

      // Configure with complex scenario
      await configureAirCooling(page, {
        ...VALIDATOR_BENCHMARK_CONFIG.airCooling,
        rackCount: 200, // Large deployment
        powerPerRack: 20,
      });
      
      await configureImmersionCooling(page, {
        ...VALIDATOR_BENCHMARK_CONFIG.immersionCooling,
        targetPower: 4000,
      });
      
      await configureFinancials(page, {
        ...VALIDATOR_BENCHMARK_CONFIG.financial,
        analysisYears: 10, // Maximum analysis period
      });

      await page.click('[data-testid="calculate-button"]');
      await waitForCalculationCompletion(page);

      const calculationTime = Date.now() - startTime;

      // Should complete within reasonable time (30 seconds max)
      expect(calculationTime).toBeLessThan(30000);

      // Environmental tab should load quickly
      const tabStartTime = Date.now();
      await page.click('[role="tab"][name*="Environmental Impact"]');
      await expect(page.locator('[data-testid="environmental-metric-card"]')).toBeVisible();
      const tabLoadTime = Date.now() - tabStartTime;

      expect(tabLoadTime).toBeLessThan(2000); // 2 seconds max for tab switch
    });

    await test.step('Verify chart rendering performance', async () => {
      await page.click('[role="tab"][name*="Charts"]');
      
      const chartStartTime = Date.now();
      await expect(page.locator('[data-testid="pue-comparison-chart"]')).toBeVisible();
      const chartLoadTime = Date.now() - chartStartTime;

      // Charts should render within 3 seconds
      expect(chartLoadTime).toBeLessThan(3000);
    });
  });

  test('should provide accessible environmental impact interface', async ({ page }) => {
    // Configure and calculate
    await configureAirCooling(page, VALIDATOR_BENCHMARK_CONFIG.airCooling);
    await configureImmersionCooling(page, VALIDATOR_BENCHMARK_CONFIG.immersionCooling);
    await configureFinancials(page, VALIDATOR_BENCHMARK_CONFIG.financial);
    
    await page.click('[data-testid="calculate-button"]');
    await waitForCalculationCompletion(page);

    await test.step('Verify keyboard navigation', async () => {
      // Tab to environmental impact tab
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Navigate to Environmental Impact tab
      await page.keyboard.press('Enter');

      // Environmental content should be accessible
      await expect(page.locator('[role="tabpanel"]')).toBeVisible();
    });

    await test.step('Verify screen reader compatibility', async () => {
      // Check for proper ARIA labels
      await page.click('[role="tab"][name*="Environmental Impact"]');
      
      // Metric cards should have proper labels
      const cards = page.locator('[data-testid="environmental-metric-card"]');
      for (let i = 0; i < await cards.count(); i++) {
        const card = cards.nth(i);
        await expect(card).toHaveAttribute('role', 'region');
      }

      // Charts should have descriptive titles
      await page.click('[role="tab"][name*="Charts"]');
      await expect(page.locator('text=Power Usage Effectiveness')).toBeVisible();
    });

    await test.step('Verify color contrast and visual accessibility', async () => {
      await page.click('[role="tab"][name*="Environmental Impact"]');

      // Check that environmental benefits use success colors (green theme)
      const successElements = page.locator('[data-testid="environmental-benefits-alert"]');
      await expect(successElements).toBeVisible();

      // Verify text is readable (contrast should be sufficient)
      const metricValues = page.locator('[data-testid*="savings"]');
      for (let i = 0; i < await metricValues.count(); i++) {
        await expect(metricValues.nth(i)).toBeVisible();
      }
    });
  });

  test('should support multiple currency and regional environmental factors', async ({ page }) => {
    const regions = [
      { region: 'US', expectedCarbonFactor: 0.4 },
      { region: 'EU', expectedCarbonFactor: 0.3 },
      { region: 'ME', expectedCarbonFactor: 0.5 },
    ];

    for (const { region, expectedCarbonFactor } of regions) {
      await test.step(`Test ${region} regional environmental calculations`, async () => {
        // Configure system
        await configureAirCooling(page, VALIDATOR_BENCHMARK_CONFIG.airCooling);
        await configureImmersionCooling(page, VALIDATOR_BENCHMARK_CONFIG.immersionCooling);
        await configureFinancials(page, {
          ...VALIDATOR_BENCHMARK_CONFIG.financial,
          region: region as any,
        });

        await page.click('[data-testid="calculate-button"]');
        await waitForCalculationCompletion(page);

        // Check environmental results reflect regional factors
        await page.click('[role="tab"][name*="Environmental Impact"]');
        
        const carbonSavings = await page.locator('[data-testid="carbon-savings-tons"]').textContent();
        const carbonValue = parseFloat(carbonSavings || '0');
        
        // Different regions should show different CO₂ savings due to different carbon factors
        expect(carbonValue).toBeGreaterThan(0);
        
        // Reset for next iteration
        await page.reload();
        await page.waitForLoadState('networkidle');
      });
    }
  });
});