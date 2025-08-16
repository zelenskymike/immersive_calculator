/**
 * Environmental Impact Error Handling Tests
 * Tests error scenarios, edge cases, and data validation for environmental calculations
 * Ensures robust handling of invalid inputs and graceful degradation
 */

import { TCOCalculationEngine, calculateTCO, CalculationUtils } from '../tco-engine';
import type { 
  CalculationConfiguration, 
  EnvironmentalImpact,
  PUEAnalysis 
} from '../../types';

describe('Environmental Impact Error Handling', () => {
  let validConfiguration: CalculationConfiguration;

  beforeEach(() => {
    validConfiguration = {
      air_cooling: {
        input_method: 'rack_count',
        rack_count: 50,
        power_per_rack_kw: 15,
        hvac_efficiency: 0.85,
        power_distribution_efficiency: 0.95,
      },
      immersion_cooling: {
        input_method: 'auto_optimize',
        target_power_kw: 750,
        pumping_efficiency: 0.92,
        heat_exchanger_efficiency: 0.95,
      },
      financial: {
        analysis_years: 5,
        currency: 'USD',
        region: 'US',
      },
    };
  });

  describe('Invalid Configuration Handling', () => {
    it('should validate and reject invalid air cooling configurations', () => {
      const invalidConfigs = [
        {
          ...validConfiguration,
          air_cooling: {
            ...validConfiguration.air_cooling,
            rack_count: 0,
          },
        },
        {
          ...validConfiguration,
          air_cooling: {
            ...validConfiguration.air_cooling,
            rack_count: -5,
          },
        },
        {
          ...validConfiguration,
          air_cooling: {
            ...validConfiguration.air_cooling,
            power_per_rack_kw: 0,
          },
        },
        {
          ...validConfiguration,
          air_cooling: {
            ...validConfiguration.air_cooling,
            power_per_rack_kw: -10,
          },
        },
        {
          ...validConfiguration,
          air_cooling: {
            ...validConfiguration.air_cooling,
            hvac_efficiency: 0,
          },
        },
        {
          ...validConfiguration,
          air_cooling: {
            ...validConfiguration.air_cooling,
            hvac_efficiency: 1.5, // Greater than 100%
          },
        },
      ];

      invalidConfigs.forEach((config, index) => {
        const validation = CalculationUtils.validateConfiguration(config);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate and reject invalid immersion cooling configurations', () => {
      const invalidConfigs = [
        {
          ...validConfiguration,
          immersion_cooling: {
            ...validConfiguration.immersion_cooling,
            target_power_kw: 0,
          },
        },
        {
          ...validConfiguration,
          immersion_cooling: {
            ...validConfiguration.immersion_cooling,
            target_power_kw: -100,
          },
        },
        {
          ...validConfiguration,
          immersion_cooling: {
            ...validConfiguration.immersion_cooling,
            pumping_efficiency: 0,
          },
        },
        {
          ...validConfiguration,
          immersion_cooling: {
            ...validConfiguration.immersion_cooling,
            pumping_efficiency: 1.2, // Greater than 100%
          },
        },
        {
          ...validConfiguration,
          immersion_cooling: {
            input_method: 'manual_config',
            tank_configurations: [], // Empty array
          },
        },
      ];

      invalidConfigs.forEach((config, index) => {
        const validation = CalculationUtils.validateConfiguration(config);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate and reject invalid financial configurations', () => {
      const invalidConfigs = [
        {
          ...validConfiguration,
          financial: {
            ...validConfiguration.financial,
            analysis_years: 0,
          },
        },
        {
          ...validConfiguration,
          financial: {
            ...validConfiguration.financial,
            analysis_years: 15, // Too high
          },
        },
        {
          ...validConfiguration,
          financial: {
            ...validConfiguration.financial,
            analysis_years: -1,
          },
        },
      ];

      invalidConfigs.forEach((config, index) => {
        const validation = CalculationUtils.validateConfiguration(config);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Case Power Values', () => {
    it('should handle extremely low power configurations', () => {
      const lowPowerConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          rack_count: 1,
          power_per_rack_kw: 0.1, // 100W per rack
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          target_power_kw: 0.1,
        },
      };

      expect(() => {
        const results = calculateTCO(lowPowerConfig);
        
        // Should still produce valid environmental results
        expect(results.environmental.energy_savings_kwh_annual).toBeGreaterThanOrEqual(0);
        expect(results.environmental.carbon_savings_kg_co2_annual).toBeGreaterThanOrEqual(0);
        expect(results.environmental.water_savings_gallons_annual).toBeGreaterThanOrEqual(0);
        expect(results.pue_analysis.improvement_percent).toBeGreaterThanOrEqual(0);
      }).not.toThrow();
    });

    it('should handle extremely high power configurations', () => {
      const highPowerConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          rack_count: 10000,
          power_per_rack_kw: 100, // 1MW total
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          target_power_kw: 1000000, // 1GW
        },
      };

      expect(() => {
        const results = calculateTCO(highPowerConfig);
        
        // Should produce reasonable environmental results without overflow
        expect(results.environmental.energy_savings_kwh_annual).toBeFinite();
        expect(results.environmental.carbon_savings_kg_co2_annual).toBeFinite();
        expect(results.environmental.water_savings_gallons_annual).toBeFinite();
        expect(results.pue_analysis.improvement_percent).toBeFinite();
        
        // Values should be within reasonable ranges
        expect(results.environmental.energy_savings_kwh_annual).toBeLessThan(Number.MAX_SAFE_INTEGER);
        expect(results.environmental.carbon_savings_kg_co2_annual).toBeLessThan(Number.MAX_SAFE_INTEGER);
      }).not.toThrow();
    });

    it('should handle zero power difference scenarios', () => {
      const equalPowerConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          hvac_efficiency: 0.98, // Very high efficiency
          power_distribution_efficiency: 0.99,
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          pumping_efficiency: 0.85, // Lower efficiency to balance
          heat_exchanger_efficiency: 0.85,
        },
      };

      const results = calculateTCO(equalPowerConfig);
      
      // Should handle minimal differences gracefully
      expect(results.environmental.energy_savings_kwh_annual).toBeGreaterThanOrEqual(0);
      expect(results.environmental.carbon_savings_kg_co2_annual).toBeGreaterThanOrEqual(0);
      expect(results.pue_analysis.improvement_percent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Regional and Currency Edge Cases', () => {
    it('should handle unsupported regions gracefully', () => {
      const unsupportedRegionConfig = {
        ...validConfiguration,
        financial: {
          ...validConfiguration.financial,
          region: 'UNKNOWN' as any,
        },
      };

      expect(() => {
        const results = calculateTCO(unsupportedRegionConfig);
        
        // Should default to US carbon factor (0.4)
        const expectedCarbonSavings = results.environmental.energy_savings_kwh_annual * 0.4;
        expect(results.environmental.carbon_savings_kg_co2_annual).toBeCloseTo(expectedCarbonSavings, -2);
      }).not.toThrow();
    });

    it('should handle unsupported currencies gracefully', () => {
      const unsupportedCurrencyConfig = {
        ...validConfiguration,
        financial: {
          ...validConfiguration.financial,
          currency: 'INVALID' as any,
        },
      };

      expect(() => {
        const results = calculateTCO(unsupportedCurrencyConfig);
        
        // Should still calculate environmental metrics (currency-independent)
        expect(results.environmental.energy_savings_kwh_annual).toBeGreaterThan(0);
        expect(results.environmental.carbon_savings_kg_co2_annual).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('should handle missing custom financial parameters', () => {
      const incompleteFinancialConfig = {
        ...validConfiguration,
        financial: {
          analysis_years: 5,
          currency: 'USD' as const,
          // Missing region, energy costs, etc.
        },
      };

      expect(() => {
        const results = calculateTCO(incompleteFinancialConfig);
        
        // Should use defaults and still calculate environmental metrics
        expect(results.environmental.energy_savings_kwh_annual).toBeGreaterThan(0);
        expect(results.environmental.carbon_savings_kg_co2_annual).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  describe('Calculation Boundary Conditions', () => {
    it('should handle PUE values at theoretical limits', () => {
      // Test PUE = 1.0 (theoretical minimum)
      const perfectEfficiencyConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          hvac_efficiency: 1.0,
          power_distribution_efficiency: 1.0,
        },
      };

      const results = calculateTCO(perfectEfficiencyConfig);
      
      // Air cooling PUE should not go below 1.0
      expect(results.pue_analysis.air_cooling).toBeGreaterThanOrEqual(1.0);
      expect(results.pue_analysis.immersion_cooling).toBeGreaterThanOrEqual(1.0);
      expect(results.pue_analysis.improvement_percent).toBeGreaterThanOrEqual(0);
    });

    it('should handle very poor efficiency scenarios', () => {
      const poorEfficiencyConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          hvac_efficiency: 0.3, // Very poor efficiency
          power_distribution_efficiency: 0.8,
        },
      };

      const results = calculateTCO(poorEfficiencyConfig);
      
      // Should still produce valid results
      expect(results.pue_analysis.air_cooling).toBeFinite();
      expect(results.pue_analysis.air_cooling).toBeGreaterThan(1.0);
      expect(results.environmental.energy_savings_kwh_annual).toBeGreaterThan(0);
    });

    it('should handle single year analysis edge case', () => {
      const singleYearConfig = {
        ...validConfiguration,
        financial: {
          ...validConfiguration.financial,
          analysis_years: 1,
        },
      };

      const results = calculateTCO(singleYearConfig);
      
      // Environmental metrics should still be calculated for annual values
      expect(results.environmental.energy_savings_kwh_annual).toBeGreaterThan(0);
      expect(results.environmental.carbon_savings_kg_co2_annual).toBeGreaterThan(0);
      expect(results.breakdown.opex_annual).toHaveLength(1);
    });

    it('should handle maximum analysis period', () => {
      const maxYearConfig = {
        ...validConfiguration,
        financial: {
          ...validConfiguration.financial,
          analysis_years: 10,
        },
      };

      const results = calculateTCO(maxYearConfig);
      
      // Environmental metrics should remain annual (not cumulative)
      expect(results.environmental.energy_savings_kwh_annual).toBeFinite();
      expect(results.environmental.carbon_savings_kg_co2_annual).toBeFinite();
      expect(results.breakdown.opex_annual).toHaveLength(10);
    });
  });

  describe('Data Type and Numeric Edge Cases', () => {
    it('should handle floating point precision issues', () => {
      const precisionConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          power_per_rack_kw: 15.123456789, // High precision
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          target_power_kw: 756.987654321,
        },
      };

      const results = calculateTCO(precisionConfig);
      
      // Should handle precision without errors
      expect(results.environmental.energy_savings_kwh_annual).toBeFinite();
      expect(results.environmental.carbon_savings_kg_co2_annual).toBeFinite();
      
      // Results should be reasonable despite precision
      expect(results.environmental.energy_savings_kwh_annual).toBeGreaterThan(0);
    });

    it('should handle very small decimal differences', () => {
      const minimalDifferenceConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          power_per_rack_kw: 15.0001,
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          target_power_kw: 750.0001,
        },
      };

      const results = calculateTCO(minimalDifferenceConfig);
      
      // Should still calculate meaningful environmental differences
      expect(results.environmental.energy_savings_kwh_annual).toBeGreaterThanOrEqual(0);
      expect(results.pue_analysis.improvement_percent).toBeGreaterThanOrEqual(0);
    });

    it('should handle NaN and Infinity inputs gracefully', () => {
      const invalidNumberConfigs = [
        {
          ...validConfiguration,
          air_cooling: {
            ...validConfiguration.air_cooling,
            power_per_rack_kw: NaN,
          },
        },
        {
          ...validConfiguration,
          air_cooling: {
            ...validConfiguration.air_cooling,
            power_per_rack_kw: Infinity,
          },
        },
        {
          ...validConfiguration,
          immersion_cooling: {
            ...validConfiguration.immersion_cooling,
            target_power_kw: -Infinity,
          },
        },
      ];

      invalidNumberConfigs.forEach(config => {
        const validation = CalculationUtils.validateConfiguration(config);
        expect(validation.valid).toBe(false);
      });
    });
  });

  describe('Environmental Calculation Error Recovery', () => {
    it('should handle carbon factor calculation errors', () => {
      // Mock a scenario where carbon factor might cause issues
      const extremeEnergyConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          rack_count: 1000000, // Extreme value
          power_per_rack_kw: 1000,
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          target_power_kw: 1000000000, // 1TW - extreme
        },
      };

      expect(() => {
        const results = calculateTCO(extremeEnergyConfig);
        
        // Should handle extreme values without crashing
        expect(results.environmental.carbon_savings_kg_co2_annual).toBeFinite();
        expect(results.environmental.energy_savings_kwh_annual).toBeFinite();
      }).not.toThrow();
    });

    it('should handle water savings calculation edge cases', () => {
      const zeroEnergyDifferenceConfig = {
        ...validConfiguration,
        // Configure systems to have identical energy usage
        air_cooling: {
          ...validConfiguration.air_cooling,
          hvac_efficiency: 0.999,
          power_distribution_efficiency: 0.999,
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          pumping_efficiency: 0.98,
          heat_exchanger_efficiency: 0.98,
        },
      };

      const results = calculateTCO(zeroEnergyDifferenceConfig);
      
      // Water savings should be proportional to energy savings
      expect(results.environmental.water_savings_gallons_annual).toBeGreaterThanOrEqual(0);
      
      if (results.environmental.energy_savings_kwh_annual === 0) {
        expect(results.environmental.water_savings_gallons_annual).toBe(0);
      }
    });

    it('should handle contextual equivalents calculation errors', () => {
      const results = calculateTCO(validConfiguration);
      
      // Test contextual calculations manually
      const carsRemoved = results.environmental.carbon_savings_kg_co2_annual / 4000;
      const homesPowered = results.environmental.energy_savings_kwh_annual / 11000;
      const treesPlanted = results.environmental.carbon_savings_kg_co2_annual / 22;
      
      // Should be finite and reasonable
      expect(carsRemoved).toBeFinite();
      expect(homesPowered).toBeFinite();
      expect(treesPlanted).toBeFinite();
      
      expect(carsRemoved).toBeGreaterThanOrEqual(0);
      expect(homesPowered).toBeGreaterThanOrEqual(0);
      expect(treesPlanted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle large scale calculations without memory leaks', () => {
      const largeBatchConfigs = Array.from({ length: 100 }, (_, i) => ({
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          rack_count: 10 + i,
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          target_power_kw: (10 + i) * 15,
        },
      }));

      expect(() => {
        largeBatchConfigs.forEach(config => {
          const results = calculateTCO(config);
          
          // Each result should be valid
          expect(results.environmental.energy_savings_kwh_annual).toBeFinite();
          expect(results.environmental.carbon_savings_kg_co2_annual).toBeFinite();
        });
      }).not.toThrow();
    });

    it('should handle complex tank configurations without errors', () => {
      const complexTankConfig = {
        ...validConfiguration,
        immersion_cooling: {
          input_method: 'manual_config' as const,
          tank_configurations: Array.from({ length: 50 }, (_, i) => ({
            size: `${20 + (i % 5)}U`,
            quantity: 1 + (i % 3),
            power_density_kw_per_u: 1.5 + (i % 10) * 0.1,
          })),
        },
      };

      expect(() => {
        const results = calculateTCO(complexTankConfig);
        
        // Should handle complex configurations
        expect(results.environmental.energy_savings_kwh_annual).toBeFinite();
        expect(results.environmental.carbon_savings_kg_co2_annual).toBeFinite();
      }).not.toThrow();
    });
  });

  describe('Concurrent Error Scenarios', () => {
    it('should handle simultaneous invalid calculations', () => {
      const invalidConfigs = [
        {
          ...validConfiguration,
          air_cooling: { ...validConfiguration.air_cooling, rack_count: -1 },
        },
        {
          ...validConfiguration,
          immersion_cooling: { ...validConfiguration.immersion_cooling, target_power_kw: 0 },
        },
        {
          ...validConfiguration,
          financial: { ...validConfiguration.financial, analysis_years: 0 },
        },
      ];

      invalidConfigs.forEach(config => {
        const validation = CalculationUtils.validateConfiguration(config);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it('should provide meaningful error messages for debugging', () => {
      const invalidConfig = {
        ...validConfiguration,
        air_cooling: {
          input_method: 'rack_count' as const,
          // Missing required fields
        },
        immersion_cooling: {
          input_method: 'manual_config' as const,
          tank_configurations: [], // Empty array
        },
      };

      const validation = CalculationUtils.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Rack count and power per rack are required for rack count input method'
      );
      expect(validation.errors).toContain(
        'Tank configurations are required for manual configuration method'
      );
    });
  });
});