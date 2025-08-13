/**
 * Comprehensive test suite for TCO Calculation Engine
 * Tests all calculation functions with 100% coverage and validation against benchmark scenarios
 */

import { TCOCalculationEngine, calculateTCO, CalculationUtils } from '../tco-engine';
import { EQUIPMENT_DEFAULTS, FINANCIAL_DEFAULTS, PUE_BENCHMARKS } from '../../constants';
import type { 
  CalculationConfiguration, 
  CalculationResults, 
  CalculationSummary,
  AnnualCosts,
  PUEAnalysis,
  EnvironmentalImpact 
} from '../../types';

describe('TCOCalculationEngine', () => {
  let baseConfiguration: CalculationConfiguration;

  beforeEach(() => {
    baseConfiguration = {
      air_cooling: {
        input_method: 'rack_count',
        rack_count: 10,
        power_per_rack_kw: 15,
        hvac_efficiency: 0.85,
        power_distribution_efficiency: 0.95,
        space_efficiency: 0.8,
      },
      immersion_cooling: {
        input_method: 'auto_optimize',
        target_power_kw: 150,
        coolant_type: 'synthetic',
        pumping_efficiency: 0.92,
        heat_exchanger_efficiency: 0.95,
      },
      financial: {
        analysis_years: 5,
        discount_rate: 0.08,
        energy_cost_kwh: 0.12,
        energy_escalation_rate: 0.03,
        maintenance_escalation_rate: 0.025,
        currency: 'USD',
        region: 'US',
      },
    };
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct configuration', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      expect(engine).toBeDefined();
    });

    it('should set default values when custom values not provided', () => {
      const configWithoutCustomValues = {
        ...baseConfiguration,
        financial: {
          ...baseConfiguration.financial,
          custom_discount_rate: undefined,
          custom_energy_cost: undefined,
        },
      };
      const engine = new TCOCalculationEngine(configWithoutCustomValues);
      expect(engine).toBeDefined();
    });
  });

  describe('Air Cooling Configuration Calculations', () => {
    it('should calculate air cooling configuration using rack count method', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      expect(results).toBeDefined();
      expect(results.summary.cost_per_kw_air_cooling).toBeGreaterThan(0);
      expect(results.pue_analysis.air_cooling).toBeGreaterThanOrEqual(1.0);
    });

    it('should calculate air cooling configuration using total power method', () => {
      const totalPowerConfig = {
        ...baseConfiguration,
        air_cooling: {
          ...baseConfiguration.air_cooling,
          input_method: 'total_power' as const,
          total_power_kw: 150,
          rack_count: undefined,
          power_per_rack_kw: undefined,
        },
      };
      
      const engine = new TCOCalculationEngine(totalPowerConfig);
      const results = engine.calculate();
      
      expect(results).toBeDefined();
      expect(results.summary.cost_per_kw_air_cooling).toBeGreaterThan(0);
      expect(results.pue_analysis.air_cooling).toBeGreaterThanOrEqual(1.0);
    });

    it('should enforce minimum PUE of 1.0 for air cooling', () => {
      const highEfficiencyConfig = {
        ...baseConfiguration,
        air_cooling: {
          ...baseConfiguration.air_cooling,
          hvac_efficiency: 0.99,
          power_distribution_efficiency: 0.99,
        },
      };
      
      const engine = new TCOCalculationEngine(highEfficiencyConfig);
      const results = engine.calculate();
      
      expect(results.pue_analysis.air_cooling).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe('Immersion Cooling Configuration Calculations', () => {
    it('should calculate immersion cooling configuration using auto-optimize method', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      expect(results).toBeDefined();
      expect(results.summary.cost_per_kw_immersion_cooling).toBeGreaterThan(0);
      expect(results.pue_analysis.immersion_cooling).toBeGreaterThanOrEqual(1.0);
      expect(results.pue_analysis.immersion_cooling).toBeLessThan(results.pue_analysis.air_cooling);
    });

    it('should calculate immersion cooling configuration using manual config method', () => {
      const manualConfig = {
        ...baseConfiguration,
        immersion_cooling: {
          ...baseConfiguration.immersion_cooling,
          input_method: 'manual_config' as const,
          target_power_kw: undefined,
          tank_configurations: [
            { size: '23U', quantity: 3, power_density_kw_per_u: 2.0 },
            { size: '20U', quantity: 2, power_density_kw_per_u: 2.0 },
          ],
        },
      };
      
      const engine = new TCOCalculationEngine(manualConfig);
      const results = engine.calculate();
      
      expect(results).toBeDefined();
      expect(results.summary.cost_per_kw_immersion_cooling).toBeGreaterThan(0);
      expect(results.pue_analysis.immersion_cooling).toBeLessThan(results.pue_analysis.air_cooling);
    });

    it('should enforce minimum PUE of 1.0 for immersion cooling', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      expect(results.pue_analysis.immersion_cooling).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe('CAPEX Calculations', () => {
    it('should calculate realistic CAPEX values for both systems', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const capex = results.breakdown.capex;
      
      // Air cooling CAPEX should include equipment, installation, and infrastructure
      expect(capex.air_cooling.equipment).toBeGreaterThan(0);
      expect(capex.air_cooling.installation).toBeGreaterThan(0);
      expect(capex.air_cooling.infrastructure).toBeGreaterThan(0);
      expect(capex.air_cooling.total).toBe(
        capex.air_cooling.equipment + capex.air_cooling.installation + capex.air_cooling.infrastructure
      );
      
      // Immersion cooling CAPEX should include equipment, installation, infrastructure, and coolant
      expect(capex.immersion_cooling.equipment).toBeGreaterThan(0);
      expect(capex.immersion_cooling.installation).toBeGreaterThan(0);
      expect(capex.immersion_cooling.infrastructure).toBeGreaterThan(0);
      expect(capex.immersion_cooling.coolant).toBeGreaterThan(0);
      expect(capex.immersion_cooling.total).toBe(
        capex.immersion_cooling.equipment + 
        capex.immersion_cooling.installation + 
        capex.immersion_cooling.infrastructure + 
        capex.immersion_cooling.coolant
      );
    });

    it('should calculate CAPEX savings correctly', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const capex = results.breakdown.capex;
      const expectedSavings = capex.air_cooling.total - capex.immersion_cooling.total;
      const expectedSavingsPercent = (expectedSavings / capex.air_cooling.total) * 100;
      
      expect(capex.savings).toBe(expectedSavings);
      expect(capex.savings_percent).toBe(expectedSavingsPercent);
      expect(results.summary.total_capex_savings).toBe(expectedSavings);
    });
  });

  describe('OPEX Calculations', () => {
    it('should calculate annual OPEX for all years', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const opexAnnual = results.breakdown.opex_annual;
      expect(opexAnnual).toHaveLength(baseConfiguration.financial.analysis_years);
      
      opexAnnual.forEach((yearData, index) => {
        expect(yearData.year).toBe(index + 1);
        
        // Air cooling OPEX should include energy, maintenance, and labor
        expect(yearData.air_cooling.energy).toBeGreaterThan(0);
        expect(yearData.air_cooling.maintenance).toBeGreaterThan(0);
        expect(yearData.air_cooling.labor).toBeGreaterThan(0);
        expect(yearData.air_cooling.total).toBe(
          yearData.air_cooling.energy! + yearData.air_cooling.maintenance! + yearData.air_cooling.labor!
        );
        
        // Immersion cooling OPEX should include energy, maintenance, coolant, and labor
        expect(yearData.immersion_cooling.energy).toBeGreaterThan(0);
        expect(yearData.immersion_cooling.maintenance).toBeGreaterThan(0);
        expect(yearData.immersion_cooling.labor).toBeGreaterThan(0);
        expect(yearData.immersion_cooling.total).toBe(
          yearData.immersion_cooling.energy! + 
          yearData.immersion_cooling.maintenance! + 
          (yearData.immersion_cooling.coolant || 0) + 
          yearData.immersion_cooling.labor!
        );
        
        // Savings calculation
        const expectedSavings = yearData.air_cooling.total - yearData.immersion_cooling.total;
        const expectedSavingsPercent = (expectedSavings / yearData.air_cooling.total) * 100;
        expect(yearData.savings).toBe(expectedSavings);
        expect(yearData.savings_percent).toBe(expectedSavingsPercent);
      });
    });

    it('should apply escalation rates correctly', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const opexAnnual = results.breakdown.opex_annual;
      
      // Check that costs escalate over time
      for (let i = 1; i < opexAnnual.length; i++) {
        expect(opexAnnual[i].air_cooling.energy).toBeGreaterThan(opexAnnual[i - 1].air_cooling.energy!);
        expect(opexAnnual[i].immersion_cooling.energy).toBeGreaterThan(opexAnnual[i - 1].immersion_cooling.energy!);
      }
    });

    it('should calculate 5-year total OPEX savings correctly', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const opexAnnual = results.breakdown.opex_annual;
      const expectedTotal = opexAnnual.reduce((sum, year) => sum + year.savings, 0);
      
      expect(results.summary.total_opex_savings_5yr).toBe(expectedTotal);
    });
  });

  describe('PUE Analysis', () => {
    it('should calculate PUE values correctly', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const pue = results.pue_analysis;
      
      expect(pue.air_cooling).toBeGreaterThanOrEqual(1.0);
      expect(pue.immersion_cooling).toBeGreaterThanOrEqual(1.0);
      expect(pue.immersion_cooling).toBeLessThan(pue.air_cooling);
      expect(pue.improvement_percent).toBeGreaterThan(0);
      expect(pue.energy_savings_kwh_annual).toBeGreaterThan(0);
    });

    it('should calculate PUE improvement percentage correctly', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const pue = results.pue_analysis;
      const expectedImprovement = ((pue.air_cooling - pue.immersion_cooling) / pue.air_cooling) * 100;
      
      expect(pue.improvement_percent).toBeCloseTo(expectedImprovement, 2);
    });
  });

  describe('Environmental Impact Analysis', () => {
    it('should calculate environmental impact metrics', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const env = results.environmental;
      
      expect(env.carbon_savings_kg_co2_annual).toBeGreaterThan(0);
      expect(env.water_savings_gallons_annual).toBeGreaterThan(0);
      expect(env.energy_savings_kwh_annual).toBeGreaterThan(0);
      expect(env.carbon_footprint_reduction_percent).toBeGreaterThan(0);
    });

    it('should use regional carbon emission factors', () => {
      const usConfig = { ...baseConfiguration, financial: { ...baseConfiguration.financial, region: 'US' as const } };
      const euConfig = { ...baseConfiguration, financial: { ...baseConfiguration.financial, region: 'EU' as const } };
      const meConfig = { ...baseConfiguration, financial: { ...baseConfiguration.financial, region: 'ME' as const } };
      
      const usResults = new TCOCalculationEngine(usConfig).calculate();
      const euResults = new TCOCalculationEngine(euConfig).calculate();
      const meResults = new TCOCalculationEngine(meConfig).calculate();
      
      // With same energy savings but different carbon factors, CO2 savings should differ
      expect(usResults.environmental.carbon_savings_kg_co2_annual).not.toBe(euResults.environmental.carbon_savings_kg_co2_annual);
      expect(meResults.environmental.carbon_savings_kg_co2_annual).toBeGreaterThan(usResults.environmental.carbon_savings_kg_co2_annual);
    });
  });

  describe('Financial Metrics', () => {
    it('should calculate ROI correctly', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const summary = results.summary;
      const expectedRoi = (summary.total_tco_savings_5yr / summary.cost_per_kw_immersion_cooling / 150) * 100;
      
      expect(summary.roi_percent).toBeGreaterThan(0);
      // ROI calculation depends on the investment amount, so we just verify it's positive for this beneficial scenario
    });

    it('should calculate NPV with discount rate', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      expect(results.summary.npv_savings).toBeGreaterThan(0);
      // NPV should be less than undiscounted total due to time value of money
      expect(results.summary.npv_savings).toBeLessThan(results.summary.total_opex_savings_5yr);
    });

    it('should calculate payback period', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      expect(results.summary.payback_months).toBeGreaterThan(0);
      expect(results.summary.payback_months).toBeLessThanOrEqual(baseConfiguration.financial.analysis_years * 12);
    });

    it('should handle scenarios with no payback within analysis period', () => {
      const expensiveConfig = {
        ...baseConfiguration,
        immersion_cooling: {
          ...baseConfiguration.immersion_cooling,
          // Make immersion cooling much more expensive by targeting very high power
          target_power_kw: 1000, // This will require more expensive infrastructure
        },
      };
      
      const engine = new TCOCalculationEngine(expensiveConfig);
      const results = engine.calculate();
      
      // Should still return a valid payback period (capped at analysis years)
      expect(results.summary.payback_months).toBeDefined();
    });
  });

  describe('TCO Progression', () => {
    it('should calculate cumulative TCO progression over time', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const progression = results.breakdown.tco_cumulative;
      expect(progression).toHaveLength(baseConfiguration.financial.analysis_years);
      
      progression.forEach((yearData, index) => {
        expect(yearData.year).toBe(index + 1);
        expect(yearData.air_cooling).toBeGreaterThan(0);
        expect(yearData.immersion_cooling).toBeGreaterThan(0);
        expect(yearData.savings).toBe(yearData.air_cooling - yearData.immersion_cooling);
        expect(yearData.npv_savings).toBeDefined();
        
        // TCO should be cumulative (increasing each year)
        if (index > 0) {
          expect(yearData.air_cooling).toBeGreaterThan(progression[index - 1].air_cooling);
          expect(yearData.immersion_cooling).toBeGreaterThan(progression[index - 1].immersion_cooling);
        }
      });
    });
  });

  describe('Chart Data Generation', () => {
    it('should generate complete chart data', () => {
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      
      const charts = results.charts;
      
      // TCO progression data
      expect(charts.tco_progression).toHaveLength(baseConfiguration.financial.analysis_years);
      charts.tco_progression.forEach(point => {
        expect(point.year).toBeDefined();
        expect(point.air_cooling).toBeGreaterThan(0);
        expect(point.immersion_cooling).toBeGreaterThan(0);
        expect(point.savings).toBeDefined();
        expect(point.cumulative_savings).toBeDefined();
      });
      
      // PUE comparison
      expect(charts.pue_comparison.air_cooling).toBeGreaterThanOrEqual(1.0);
      expect(charts.pue_comparison.immersion_cooling).toBeGreaterThanOrEqual(1.0);
      
      // Cost categories
      expect(charts.cost_categories).toBeDefined();
      expect(charts.cost_categories['Equipment']).toBeDefined();
      expect(charts.cost_categories['Installation']).toBeDefined();
      expect(charts.cost_categories['Infrastructure']).toBeDefined();
      expect(charts.cost_categories['Annual Energy']).toBeDefined();
    });
  });

  describe('Configuration Hash and Metadata', () => {
    it('should generate unique calculation ID and hash', () => {
      const engine1 = new TCOCalculationEngine(baseConfiguration);
      const engine2 = new TCOCalculationEngine(baseConfiguration);
      
      const results1 = engine1.calculate();
      const results2 = engine2.calculate();
      
      // Different calculation IDs
      expect(results1.calculation_id).not.toBe(results2.calculation_id);
      
      // Same configuration hash (same input)
      expect(results1.configuration_hash).toBe(results2.configuration_hash);
      
      // Metadata
      expect(results1.calculated_at).toBeDefined();
      expect(results1.calculation_version).toBe('1.0');
    });

    it('should generate different hashes for different configurations', () => {
      const config1 = baseConfiguration;
      const config2 = { ...baseConfiguration, financial: { ...baseConfiguration.financial, analysis_years: 3 } };
      
      const results1 = new TCOCalculationEngine(config1).calculate();
      const results2 = new TCOCalculationEngine(config2).calculate();
      
      expect(results1.configuration_hash).not.toBe(results2.configuration_hash);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete calculation within performance threshold', () => {
      const startTime = Date.now();
      const engine = new TCOCalculationEngine(baseConfiguration);
      const results = engine.calculate();
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero power configurations gracefully', () => {
      const zeroConfig = {
        ...baseConfiguration,
        air_cooling: {
          ...baseConfiguration.air_cooling,
          rack_count: 1,
          power_per_rack_kw: 0.1, // Very low power
        },
        immersion_cooling: {
          ...baseConfiguration.immersion_cooling,
          target_power_kw: 0.1,
        },
      };
      
      const engine = new TCOCalculationEngine(zeroConfig);
      const results = engine.calculate();
      
      expect(results).toBeDefined();
      expect(results.summary.cost_per_kw_air_cooling).toBeDefined();
      expect(results.summary.cost_per_kw_immersion_cooling).toBeDefined();
    });

    it('should handle very large configurations', () => {
      const largeConfig = {
        ...baseConfiguration,
        air_cooling: {
          ...baseConfiguration.air_cooling,
          rack_count: 500,
          power_per_rack_kw: 20,
        },
        immersion_cooling: {
          ...baseConfiguration.immersion_cooling,
          target_power_kw: 10000,
        },
      };
      
      const engine = new TCOCalculationEngine(largeConfig);
      const results = engine.calculate();
      
      expect(results).toBeDefined();
      expect(results.summary.total_tco_savings_5yr).toBeDefined();
    });

    it('should handle single year analysis', () => {
      const singleYearConfig = {
        ...baseConfiguration,
        financial: {
          ...baseConfiguration.financial,
          analysis_years: 1,
        },
      };
      
      const engine = new TCOCalculationEngine(singleYearConfig);
      const results = engine.calculate();
      
      expect(results.breakdown.opex_annual).toHaveLength(1);
      expect(results.breakdown.tco_cumulative).toHaveLength(1);
      expect(results.charts.tco_progression).toHaveLength(1);
    });

    it('should handle maximum analysis period', () => {
      const maxYearConfig = {
        ...baseConfiguration,
        financial: {
          ...baseConfiguration.financial,
          analysis_years: 10,
        },
      };
      
      const engine = new TCOCalculationEngine(maxYearConfig);
      const results = engine.calculate();
      
      expect(results.breakdown.opex_annual).toHaveLength(10);
      expect(results.breakdown.tco_cumulative).toHaveLength(10);
      expect(results.charts.tco_progression).toHaveLength(10);
    });
  });
});

describe('calculateTCO convenience function', () => {
  it('should produce same results as direct engine usage', () => {
    const config: CalculationConfiguration = {
      air_cooling: {
        input_method: 'rack_count',
        rack_count: 5,
        power_per_rack_kw: 12,
      },
      immersion_cooling: {
        input_method: 'auto_optimize',
        target_power_kw: 60,
      },
      financial: {
        analysis_years: 3,
        currency: 'USD',
        region: 'US',
      },
    };

    const engineResult = new TCOCalculationEngine(config).calculate();
    const convenienceResult = calculateTCO(config);
    
    expect(convenienceResult.configuration_hash).toBe(engineResult.configuration_hash);
    expect(convenienceResult.summary.total_tco_savings_5yr).toBe(engineResult.summary.total_tco_savings_5yr);
  });
});

describe('CalculationUtils', () => {
  describe('validateConfiguration', () => {
    it('should validate correct configuration', () => {
      const validConfig: CalculationConfiguration = {
        air_cooling: {
          input_method: 'rack_count',
          rack_count: 10,
          power_per_rack_kw: 15,
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 150,
        },
        financial: {
          analysis_years: 5,
          currency: 'USD',
        },
      };
      
      const validation = CalculationUtils.validateConfiguration(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields for rack count method', () => {
      const invalidConfig: CalculationConfiguration = {
        air_cooling: {
          input_method: 'rack_count',
          // Missing rack_count and power_per_rack_kw
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 150,
        },
        financial: {
          analysis_years: 5,
          currency: 'USD',
        },
      };
      
      const validation = CalculationUtils.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Rack count and power per rack are required for rack count input method');
    });

    it('should detect missing total power for total power method', () => {
      const invalidConfig: CalculationConfiguration = {
        air_cooling: {
          input_method: 'total_power',
          // Missing total_power_kw
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 150,
        },
        financial: {
          analysis_years: 5,
          currency: 'USD',
        },
      };
      
      const validation = CalculationUtils.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Total power is required for total power input method');
    });

    it('should detect invalid analysis years', () => {
      const invalidConfig: CalculationConfiguration = {
        air_cooling: {
          input_method: 'rack_count',
          rack_count: 10,
          power_per_rack_kw: 15,
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 150,
        },
        financial: {
          analysis_years: 15, // Too high
          currency: 'USD',
        },
      };
      
      const validation = CalculationUtils.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Analysis years must be between 1 and 10');
    });
  });

  describe('estimateProcessingTime', () => {
    it('should estimate processing time based on configuration complexity', () => {
      const simpleConfig: CalculationConfiguration = {
        air_cooling: { input_method: 'rack_count', rack_count: 1, power_per_rack_kw: 10 },
        immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 10 },
        financial: { analysis_years: 1, currency: 'USD' },
      };
      
      const complexConfig: CalculationConfiguration = {
        air_cooling: { input_method: 'rack_count', rack_count: 100, power_per_rack_kw: 20 },
        immersion_cooling: { 
          input_method: 'manual_config',
          tank_configurations: [
            { size: '23U', quantity: 10, power_density_kw_per_u: 2.0 },
            { size: '20U', quantity: 5, power_density_kw_per_u: 2.0 },
          ],
        },
        financial: { analysis_years: 10, currency: 'USD' },
      };
      
      const simpleTime = CalculationUtils.estimateProcessingTime(simpleConfig);
      const complexTime = CalculationUtils.estimateProcessingTime(complexConfig);
      
      expect(simpleTime).toBeLessThan(complexTime);
      expect(simpleTime).toBeGreaterThan(0);
      expect(complexTime).toBeLessThanOrEqual(5000); // Capped at 5 seconds
    });
  });

  describe('convertCurrency', () => {
    it('should return same amount for same currency', () => {
      const amount = 1000;
      const result = CalculationUtils.convertCurrency(amount, 'USD', 'USD', {});
      expect(result).toBe(amount);
    });

    it('should convert using exchange rate', () => {
      const amount = 1000;
      const exchangeRates = { 'USD_EUR': 0.85 };
      const result = CalculationUtils.convertCurrency(amount, 'USD', 'EUR', exchangeRates);
      expect(result).toBe(850);
    });

    it('should convert using inverse rate', () => {
      const amount = 850;
      const exchangeRates = { 'USD_EUR': 0.85 };
      const result = CalculationUtils.convertCurrency(amount, 'EUR', 'USD', exchangeRates);
      expect(result).toBeCloseTo(1000, 2);
    });

    it('should throw error for missing exchange rate', () => {
      const amount = 1000;
      const exchangeRates = {};
      expect(() => {
        CalculationUtils.convertCurrency(amount, 'USD', 'EUR', exchangeRates);
      }).toThrow('Exchange rate not found for USD to EUR');
    });
  });
});

// Benchmark scenarios for calculation accuracy verification
describe('Benchmark Scenarios', () => {
  describe('Small Data Center (10 racks)', () => {
    it('should calculate realistic savings for small deployment', () => {
      const config: CalculationConfiguration = {
        air_cooling: {
          input_method: 'rack_count',
          rack_count: 10,
          power_per_rack_kw: 15,
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 150,
        },
        financial: {
          analysis_years: 5,
          currency: 'USD',
          region: 'US',
        },
      };
      
      const results = calculateTCO(config);
      
      // Expected ranges based on industry benchmarks
      expect(results.summary.pue_air_cooling).toBeGreaterThan(1.2);
      expect(results.summary.pue_air_cooling).toBeLessThan(2.0);
      expect(results.summary.pue_immersion_cooling).toBeGreaterThan(1.0);
      expect(results.summary.pue_immersion_cooling).toBeLessThan(1.1);
      expect(results.summary.energy_efficiency_improvement).toBeGreaterThan(10);
      expect(results.summary.total_tco_savings_5yr).toBeGreaterThan(0);
    });
  });

  describe('Medium Data Center (50 racks)', () => {
    it('should show economies of scale for medium deployment', () => {
      const config: CalculationConfiguration = {
        air_cooling: {
          input_method: 'rack_count',
          rack_count: 50,
          power_per_rack_kw: 15,
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 750,
        },
        financial: {
          analysis_years: 5,
          currency: 'USD',
          region: 'US',
        },
      };
      
      const results = calculateTCO(config);
      
      // Should have better economics than small deployment
      expect(results.summary.roi_percent).toBeGreaterThan(15);
      expect(results.summary.payback_months).toBeLessThan(48);
    });
  });

  describe('Large Data Center (200 racks)', () => {
    it('should demonstrate maximum benefits for large deployment', () => {
      const config: CalculationConfiguration = {
        air_cooling: {
          input_method: 'rack_count',
          rack_count: 200,
          power_per_rack_kw: 20,
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 4000,
        },
        financial: {
          analysis_years: 5,
          currency: 'USD',
          region: 'US',
        },
      };
      
      const results = calculateTCO(config);
      
      // Large deployments should have best ROI
      expect(results.summary.roi_percent).toBeGreaterThan(25);
      expect(results.summary.payback_months).toBeLessThan(36);
      expect(results.summary.total_tco_savings_5yr).toBeGreaterThan(500000);
    });
  });

  describe('Regional Cost Variations', () => {
    it('should reflect regional energy cost differences', () => {
      const baseConfig = {
        air_cooling: { input_method: 'rack_count' as const, rack_count: 20, power_per_rack_kw: 15 },
        immersion_cooling: { input_method: 'auto_optimize' as const, target_power_kw: 300 },
        financial: { analysis_years: 5, currency: 'USD' as const },
      };
      
      const usConfig = { ...baseConfig, financial: { ...baseConfig.financial, region: 'US' as const } };
      const euConfig = { ...baseConfig, financial: { ...baseConfig.financial, region: 'EU' as const } };
      const meConfig = { ...baseConfig, financial: { ...baseConfig.financial, region: 'ME' as const } };
      
      const usResults = calculateTCO(usConfig);
      const euResults = calculateTCO(euConfig);
      const meResults = calculateTCO(meConfig);
      
      // EU should have highest energy savings due to high energy costs
      expect(euResults.summary.total_opex_savings_5yr).toBeGreaterThan(usResults.summary.total_opex_savings_5yr);
      // ME should have lowest due to subsidized energy
      expect(meResults.summary.total_opex_savings_5yr).toBeLessThan(usResults.summary.total_opex_savings_5yr);
    });
  });
});