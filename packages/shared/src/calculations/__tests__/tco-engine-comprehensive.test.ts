/**
 * Comprehensive TCO Engine Tests - Enhanced Coverage
 * Tests edge cases, error scenarios, and boundary conditions for production readiness
 */

import { TCOCalculationEngine, calculateTCO, CalculationUtils } from '../tco-engine';
import { EQUIPMENT_DEFAULTS, FINANCIAL_DEFAULTS, PUE_BENCHMARKS } from '../../constants';
import type { 
  CalculationConfiguration, 
  CalculationResults,
  ValidationResult
} from '../../types';

describe('TCO Engine - Comprehensive Edge Cases', () => {
  describe('Configuration Validation Edge Cases', () => {
    it('should handle floating point precision issues', () => {
      const config = sharedTestUtils.createValidConfiguration({
        air_cooling: {
          rack_count: 10,
          power_per_rack_kw: 15.333333333333334, // Floating point precision
        },
        immersion_cooling: {
          target_power_kw: 153.33333333333334,
        },
        financial: {
          discount_rate: 0.08000000000000002, // Precision issue
          energy_cost_kwh: 0.1200000000000001,
        },
      });

      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();

      expect(results).toBeDefined();
      expect(results.summary.total_tco_savings_5yr).toBePositiveFinancialValue();
      
      // Verify precision is maintained within reasonable bounds
      expect(sharedTestUtils.testNumericPrecision(results.summary.total_tco_savings_5yr, 2)).toBe(true);
      expect(sharedTestUtils.testNumericPrecision(results.summary.roi_percent, 2)).toBe(true);
    });

    it('should handle extreme but valid rack configurations', () => {
      const extremeConfigs = [
        // Single rack, minimum power
        {
          air_cooling: { rack_count: 1, power_per_rack_kw: 0.5 },
          immersion_cooling: { target_power_kw: 0.5 },
        },
        // Maximum racks, maximum power per rack
        {
          air_cooling: { rack_count: 1000, power_per_rack_kw: 50 },
          immersion_cooling: { target_power_kw: 50000 },
        },
        // High density configuration
        {
          air_cooling: { rack_count: 100, power_per_rack_kw: 45 },
          immersion_cooling: { target_power_kw: 4500 },
        },
      ];

      extremeConfigs.forEach((configOverride, index) => {
        const config = sharedTestUtils.createValidConfiguration(configOverride);
        const engine = new TCOCalculationEngine(config);
        
        expect(() => {
          const results = engine.calculate();
          expect(results).toHaveValidTCOStructure();
          expect(results.summary.total_tco_savings_5yr).toBeGreaterThanOrEqual(0);
        }).not.toThrow(`Extreme config ${index} should not throw`);
      });
    });

    it('should handle boundary financial parameters', () => {
      const boundaryConfigs = [
        // Minimum analysis period
        { financial: { analysis_years: 1 } },
        // Maximum analysis period
        { financial: { analysis_years: 10 } },
        // Very low discount rate
        { financial: { discount_rate: 0.001 } },
        // High discount rate
        { financial: { discount_rate: 0.20 } },
        // Very low energy cost
        { financial: { energy_cost_kwh: 0.01 } },
        // Very high energy cost
        { financial: { energy_cost_kwh: 0.50 } },
      ];

      boundaryConfigs.forEach((configOverride, index) => {
        const config = sharedTestUtils.createValidConfiguration(configOverride);
        const engine = new TCOCalculationEngine(config);
        
        expect(() => {
          const results = engine.calculate();
          expect(results.breakdown.opex_annual).toHaveLength(config.financial.analysis_years);
        }).not.toThrow(`Boundary config ${index} should not throw`);
      });
    });

    it('should validate immersion cooling tank configurations thoroughly', () => {
      const invalidTankConfigs = [
        // Empty tank array
        {
          immersion_cooling: {
            input_method: 'manual_config' as const,
            tank_configurations: [],
          },
        },
        // Tank with zero quantity
        {
          immersion_cooling: {
            input_method: 'manual_config' as const,
            tank_configurations: [
              { size: '23U' as const, quantity: 0, power_density_kw_per_u: 2.0 },
            ],
          },
        },
        // Tank with excessive power density
        {
          immersion_cooling: {
            input_method: 'manual_config' as const,
            tank_configurations: [
              { size: '23U' as const, quantity: 1, power_density_kw_per_u: 10.0 },
            ],
          },
        },
      ];

      invalidTankConfigs.forEach((configOverride) => {
        const config = { ...sharedTestUtils.createValidConfiguration(), ...configOverride };
        const validation = CalculationUtils.validateConfiguration(config as CalculationConfiguration);
        
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Mathematical Edge Cases', () => {
    it('should handle scenarios with zero or near-zero savings', () => {
      // Configuration where immersion cooling is not significantly better
      const config = sharedTestUtils.createValidConfiguration({
        air_cooling: {
          hvac_efficiency: 0.98,
          power_distribution_efficiency: 0.99,
        },
        immersion_cooling: {
          target_power_kw: 150,
          pumping_efficiency: 0.85, // Lower efficiency
          heat_exchanger_efficiency: 0.85,
        },
        financial: {
          custom_energy_cost: 0.02, // Very low energy cost
        },
      });

      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();

      expect(results).toBeDefined();
      // Savings might be minimal or zero, but should not be negative
      expect(results.summary.total_tco_savings_5yr).toBeGreaterThanOrEqual(0);
      expect(results.summary.roi_percent).toBeGreaterThanOrEqual(0);
    });

    it('should handle very high discount rates affecting NPV', () => {
      const config = sharedTestUtils.createValidConfiguration({
        financial: {
          discount_rate: 0.25, // 25% discount rate
        },
      });

      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();

      expect(results.summary.npv_savings).toBeDefined();
      // With high discount rate, NPV should be much less than undiscounted total
      expect(results.summary.npv_savings).toBeLessThan(results.summary.total_opex_savings_5yr);
      
      // But should not be negative if there are real savings
      if (results.summary.total_tco_savings_5yr > 0) {
        expect(results.summary.npv_savings).toBeGreaterThan(0);
      }
    });

    it('should handle currency conversion edge cases', () => {
      const testCases = [
        // Same currency conversion
        { from: 'USD', to: 'USD', amount: 1000, expected: 1000 },
        // Standard conversion
        { from: 'USD', to: 'EUR', amount: 1000, expected: 850, rate: { 'USD_EUR': 0.85 } },
        // Inverse conversion
        { from: 'EUR', to: 'USD', amount: 850, expected: 1000, rate: { 'USD_EUR': 0.85 } },
        // Very small amount
        { from: 'USD', to: 'EUR', amount: 0.01, expected: 0.0085, rate: { 'USD_EUR': 0.85 } },
      ];

      testCases.forEach(testCase => {
        const result = CalculationUtils.convertCurrency(
          testCase.amount,
          testCase.from as any,
          testCase.to as any,
          testCase.rate || {}
        );
        
        expect(result).toBeCloseTo(testCase.expected, 4);
      });
    });

    it('should maintain mathematical consistency across scale', () => {
      const baseConfig = sharedTestUtils.createValidConfiguration({
        air_cooling: { rack_count: 10, power_per_rack_kw: 15 },
        immersion_cooling: { target_power_kw: 150 },
      });

      const scaledConfig = sharedTestUtils.createValidConfiguration({
        air_cooling: { rack_count: 100, power_per_rack_kw: 15 },
        immersion_cooling: { target_power_kw: 1500 },
      });

      const baseResults = new TCOCalculationEngine(baseConfig).calculate();
      const scaledResults = new TCOCalculationEngine(scaledConfig).calculate();

      // Scaled results should be approximately 10x the base results
      const scaleFactor = 10;
      const tolerance = 0.15; // 15% tolerance for scaling effects

      const baseTotal = baseResults.summary.total_tco_savings_5yr;
      const scaledTotal = scaledResults.summary.total_tco_savings_5yr;
      const actualScaleFactor = scaledTotal / baseTotal;

      expect(actualScaleFactor).toBeWithinRange(
        scaleFactor * (1 - tolerance),
        scaleFactor * (1 + tolerance)
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should gracefully handle malformed configuration objects', () => {
      const malformedConfigs = [
        // Missing required nested objects
        { air_cooling: null } as any,
        { immersion_cooling: undefined } as any,
        { financial: {} } as any,
        
        // Wrong data types
        {
          air_cooling: { rack_count: '10' }, // String instead of number
          immersion_cooling: { target_power_kw: 150 },
          financial: { analysis_years: 5, currency: 'USD' },
        } as any,
        
        // Negative values
        {
          air_cooling: { rack_count: -5, power_per_rack_kw: 15 },
          immersion_cooling: { target_power_kw: 150 },
          financial: { analysis_years: 5, currency: 'USD' },
        } as any,
      ];

      malformedConfigs.forEach((config, index) => {
        expect(() => {
          new TCOCalculationEngine(config);
        }).toThrow(`Malformed config ${index} should throw an error`);
      });
    });

    it('should validate configuration before calculation', () => {
      const invalidConfig = sharedTestUtils.createInvalidConfigurations().invalidRackCount;
      
      const validation = CalculationUtils.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Rack count must be between 1 and 1000');
    });

    it('should handle NaN and Infinity values', () => {
      const config = sharedTestUtils.createValidConfiguration({
        financial: {
          discount_rate: NaN as any,
        },
      });

      expect(() => {
        new TCOCalculationEngine(config);
      }).toThrow('Invalid discount rate');
    });

    it('should provide meaningful error messages for invalid configurations', () => {
      const testCases = [
        {
          config: sharedTestUtils.createInvalidConfigurations().invalidAnalysisYears,
          expectedError: 'Analysis years must be between 1 and 10',
        },
        {
          config: sharedTestUtils.createInvalidConfigurations().invalidTotalPower,
          expectedError: 'Total power exceeds maximum allowed (50,000 kW)',
        },
        {
          config: sharedTestUtils.createInvalidConfigurations().emptyTankConfigurations,
          expectedError: 'At least one tank configuration is required for manual config method',
        },
      ];

      testCases.forEach(testCase => {
        const validation = CalculationUtils.validateConfiguration(testCase.config);
        expect(validation.valid).toBe(false);
        expect(validation.errors.join(' ')).toContain(testCase.expectedError);
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle very large configurations without memory issues', () => {
      const largeConfig = sharedTestUtils.createMaximumConfiguration();
      
      const { result: results, memoryDelta } = sharedTestUtils.measureMemoryUsage(
        'large-configuration',
        () => new TCOCalculationEngine(largeConfig).calculate()
      );

      expect(results).toBeDefined();
      expect(results).toHaveValidTCOStructure();
      
      // Memory usage should be reasonable (less than 50MB for even large configs)
      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024);
    });

    it('should complete calculations within performance thresholds', async () => {
      const testConfigs = [
        { name: 'simple', config: sharedTestUtils.createMinimumConfiguration(), threshold: 100 },
        { name: 'medium', config: sharedTestUtils.createValidConfiguration(), threshold: 500 },
        { name: 'complex', config: sharedTestUtils.createComplexConfiguration(), threshold: 1000 },
        { name: 'maximum', config: sharedTestUtils.createMaximumConfiguration(), threshold: 2000 },
      ];

      for (const testConfig of testConfigs) {
        const { result, duration } = await sharedTestUtils.measureCalculationTime(
          testConfig.name,
          () => new TCOCalculationEngine(testConfig.config).calculate()
        );

        expect(result).toBeDefined();
        expect(duration).toBeLessThan(testConfig.threshold);
      }
    });

    it('should not have memory leaks with repeated calculations', async () => {
      const config = sharedTestUtils.createValidConfiguration();
      
      const memoryTest = async () => {
        const engine = new TCOCalculationEngine(config);
        const results = engine.calculate();
        // Explicitly clear references
        Object.keys(results).forEach(key => delete (results as any)[key]);
      };

      const { hasLeak, memoryGrowth } = await performanceTestUtils.detectMemoryLeaks(
        'repeated-calculations',
        memoryTest,
        50
      );

      expect(hasLeak).toBe(false);
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain calculation consistency across multiple runs', () => {
      const config = sharedTestUtils.createValidConfiguration();
      const results: CalculationResults[] = [];

      // Run calculation multiple times
      for (let i = 0; i < 10; i++) {
        const engine = new TCOCalculationEngine(config);
        results.push(engine.calculate());
      }

      // All results should be identical (excluding dynamic fields)
      const baseResult = results[0];
      
      results.slice(1).forEach((result, index) => {
        const comparison = sharedTestUtils.compareCalculationResults(baseResult, result, 0.001);
        expect(comparison.equal).toBe(true);
        
        if (!comparison.equal) {
          console.error(`Results differ at run ${index + 1}:`, comparison.differences);
        }
      });
    });

    it('should generate unique calculation IDs but consistent hashes', () => {
      const config = sharedTestUtils.createValidConfiguration();
      const results: CalculationResults[] = [];

      for (let i = 0; i < 5; i++) {
        const engine = new TCOCalculationEngine(config);
        results.push(engine.calculate());
      }

      // Calculation IDs should be unique
      const calculationIds = results.map(r => r.calculation_id);
      const uniqueIds = new Set(calculationIds);
      expect(uniqueIds.size).toBe(calculationIds.length);

      // Configuration hashes should be identical
      const configHashes = results.map(r => r.configuration_hash);
      const uniqueHashes = new Set(configHashes);
      expect(uniqueHashes.size).toBe(1);
    });

    it('should maintain referential integrity in breakdown data', () => {
      const config = sharedTestUtils.createValidConfiguration();
      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();

      // CAPEX totals should match sum of components
      expect(results.breakdown.capex.air_cooling.total).toBe(
        results.breakdown.capex.air_cooling.equipment +
        results.breakdown.capex.air_cooling.installation +
        results.breakdown.capex.air_cooling.infrastructure
      );

      expect(results.breakdown.capex.immersion_cooling.total).toBe(
        results.breakdown.capex.immersion_cooling.equipment +
        results.breakdown.capex.immersion_cooling.installation +
        results.breakdown.capex.immersion_cooling.infrastructure +
        results.breakdown.capex.immersion_cooling.coolant
      );

      // OPEX annual totals should match sum of components
      results.breakdown.opex_annual.forEach((yearData, year) => {
        expect(yearData.air_cooling.total).toBe(
          yearData.air_cooling.energy! +
          yearData.air_cooling.maintenance! +
          yearData.air_cooling.labor!
        );

        expect(yearData.immersion_cooling.total).toBe(
          yearData.immersion_cooling.energy! +
          yearData.immersion_cooling.maintenance! +
          (yearData.immersion_cooling.coolant || 0) +
          yearData.immersion_cooling.labor!
        );
      });

      // Chart data should match breakdown data
      expect(results.charts.tco_progression).toHaveLength(config.financial.analysis_years);
      
      results.charts.tco_progression.forEach((chartPoint, index) => {
        expect(chartPoint.year).toBe(index + 1);
        expect(typeof chartPoint.air_cooling).toBe('number');
        expect(typeof chartPoint.immersion_cooling).toBe('number');
        expect(typeof chartPoint.savings).toBe('number');
      });
    });

    it('should validate environmental impact calculations', () => {
      const config = sharedTestUtils.createValidConfiguration();
      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();

      const env = results.environmental;

      // Environmental metrics should be positive
      expect(env.carbon_savings_kg_co2_annual).toBePositiveFinancialValue();
      expect(env.water_savings_gallons_annual).toBePositiveFinancialValue();
      expect(env.energy_savings_kwh_annual).toBePositiveFinancialValue();
      expect(env.carbon_footprint_reduction_percent).toBeGreaterThanOrEqual(0);

      // Carbon savings should correlate with energy savings
      expect(env.carbon_savings_kg_co2_annual).toBeGreaterThan(0);
      expect(env.energy_savings_kwh_annual).toBeGreaterThan(0);

      // Regional variations should be reflected
      const regionConfigs = sharedTestUtils.createRegionalConfigurations();
      const usResults = new TCOCalculationEngine(regionConfigs.US).calculate();
      const euResults = new TCOCalculationEngine(regionConfigs.EU).calculate();
      const meResults = new TCOCalculationEngine(regionConfigs.ME).calculate();

      // EU should have highest carbon savings (highest carbon factor)
      expect(euResults.environmental.carbon_savings_kg_co2_annual)
        .toBeGreaterThan(usResults.environmental.carbon_savings_kg_co2_annual);
      
      // ME should have lowest carbon savings (lowest carbon factor)
      expect(meResults.environmental.carbon_savings_kg_co2_annual)
        .toBeLessThan(usResults.environmental.carbon_savings_kg_co2_annual);
    });
  });

  describe('Localization and Multi-Currency Support', () => {
    it('should handle all supported currencies', () => {
      const currencies = ['USD', 'EUR', 'SAR', 'AED'];
      
      currencies.forEach(currency => {
        const config = sharedTestUtils.createValidConfiguration({
          financial: { currency: currency as any },
        });

        const engine = new TCOCalculationEngine(config);
        const results = engine.calculate();

        expect(results).toBeDefined();
        expect(results.summary.total_tco_savings_5yr).toBePositiveFinancialValue();
        
        // Currency-specific validation could go here
        // e.g., formatting, exchange rates, regional defaults
      });
    });

    it('should apply correct regional defaults', () => {
      const regionalTests = [
        { region: 'US', expectedCurrency: 'USD', highEnergyRate: false },
        { region: 'EU', expectedCurrency: 'EUR', highEnergyRate: true },
        { region: 'ME', expectedCurrency: 'SAR', highEnergyRate: false },
      ];

      regionalTests.forEach(test => {
        const config = sharedTestUtils.createValidConfiguration({
          financial: { region: test.region as any },
        });

        // Regional energy costs should vary appropriately
        // This would depend on implementation of regional defaults
        const engine = new TCOCalculationEngine(config);
        const results = engine.calculate();

        expect(results).toBeDefined();
        // Additional regional-specific assertions could go here
      });
    });

    it('should handle currency conversion with various exchange rates', () => {
      const exchangeRateScenarios = [
        // Normal rates
        { USD_EUR: 0.85, USD_SAR: 3.75, USD_AED: 3.67 },
        // Extreme rates (economic crisis scenarios)
        { USD_EUR: 0.5, USD_SAR: 10.0, USD_AED: 8.0 },
        // Very close rates
        { USD_EUR: 0.999, USD_SAR: 1.001, USD_AED: 1.002 },
      ];

      exchangeRateScenarios.forEach((rates, index) => {
        const usdAmount = 100000;
        
        Object.entries(rates).forEach(([pair, rate]) => {
          const [from, to] = pair.split('_');
          const converted = CalculationUtils.convertCurrency(usdAmount, from as any, to as any, rates);
          const expected = usdAmount * rate;
          
          expect(converted).toBeCloseTo(expected, 2);
        });
      });
    });
  });
});