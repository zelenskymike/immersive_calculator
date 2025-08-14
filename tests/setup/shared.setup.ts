/**
 * Shared package test setup configuration
 * Sets up utilities for testing calculation engine, validation, and utility functions
 */

import { jest } from '@jest/globals';
import type { CalculationConfiguration, CalculationResults } from '@tco-calculator/shared';

// Mock external dependencies that shared package might use
jest.mock('crypto', () => ({
  createHash: jest.fn().mockImplementation((algorithm: string) => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash-' + Date.now()),
  })),
  randomUUID: jest.fn().mockImplementation(() => 
    'mock-uuid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  ),
}));

// Setup performance monitoring for shared package tests
let performanceMarks: { name: string; startTime: number; endTime?: number; duration?: number }[] = [];

beforeEach(() => {
  performanceMarks = [];
  // Reset any global state that might affect calculations
  jest.clearAllMocks();
});

afterEach(() => {
  // Log performance metrics if any were recorded
  if (performanceMarks.length > 0) {
    performanceMarks.forEach(mark => {
      if (mark.duration !== undefined) {
        console.log(`Performance: ${mark.name} took ${mark.duration.toFixed(2)}ms`);
      }
    });
  }
});

// Shared package test utilities
export const sharedTestUtils = {
  // Configuration generation utilities
  createValidConfiguration: (overrides: Partial<CalculationConfiguration> = {}): CalculationConfiguration => {
    const baseConfig: CalculationConfiguration = {
      air_cooling: {
        input_method: 'rack_count',
        rack_count: 10,
        power_per_rack_kw: 15,
        rack_type: '42U_STANDARD',
        hvac_efficiency: 0.85,
        power_distribution_efficiency: 0.95,
        space_efficiency: 0.8,
        cooling_load_factor: 1.2,
        redundancy_factor: 1.1,
      },
      immersion_cooling: {
        input_method: 'auto_optimize',
        target_power_kw: 150,
        coolant_type: 'synthetic',
        pumping_efficiency: 0.92,
        heat_exchanger_efficiency: 0.95,
        cooling_efficiency: 0.98,
        maintenance_factor: 0.85,
      },
      financial: {
        analysis_years: 5,
        discount_rate: 0.08,
        currency: 'USD',
        region: 'US',
        energy_cost_kwh: 0.12,
        energy_escalation_rate: 0.03,
        maintenance_escalation_rate: 0.025,
        labor_cost_hour: 75,
      },
    };

    // Deep merge overrides
    return {
      ...baseConfig,
      air_cooling: { ...baseConfig.air_cooling, ...overrides.air_cooling },
      immersion_cooling: { ...baseConfig.immersion_cooling, ...overrides.immersion_cooling },
      financial: { ...baseConfig.financial, ...overrides.financial },
    };
  },

  // Test data generators for edge cases
  createMinimumConfiguration: (): CalculationConfiguration => ({
    air_cooling: {
      input_method: 'rack_count',
      rack_count: 1,
      power_per_rack_kw: 0.5,
    },
    immersion_cooling: {
      input_method: 'auto_optimize',
      target_power_kw: 0.5,
    },
    financial: {
      analysis_years: 1,
      currency: 'USD',
    },
  }),

  createMaximumConfiguration: (): CalculationConfiguration => ({
    air_cooling: {
      input_method: 'total_power',
      total_power_kw: 50000, // Maximum allowed power
    },
    immersion_cooling: {
      input_method: 'manual_config',
      tank_configurations: [
        { size: '23U', quantity: 100, power_density_kw_per_u: 2.5 },
        { size: '20U', quantity: 75, power_density_kw_per_u: 2.5 },
        { size: '18U', quantity: 50, power_density_kw_per_u: 2.5 },
        { size: '16U', quantity: 25, power_density_kw_per_u: 2.5 },
      ],
      coolant_type: 'synthetic',
    },
    financial: {
      analysis_years: 10, // Maximum analysis period
      currency: 'USD',
      custom_discount_rate: 0.15,
      custom_energy_cost: 0.30,
      custom_labor_cost: 150,
    },
  }),

  createComplexConfiguration: (): CalculationConfiguration => ({
    air_cooling: {
      input_method: 'rack_count',
      rack_count: 150,
      power_per_rack_kw: 20,
      rack_type: '48U_HIGH_DENSITY',
      hvac_efficiency: 0.90,
      power_distribution_efficiency: 0.97,
      space_efficiency: 0.85,
      cooling_load_factor: 1.3,
      redundancy_factor: 1.2,
    },
    immersion_cooling: {
      input_method: 'manual_config',
      tank_configurations: [
        { size: '23U', quantity: 20, power_density_kw_per_u: 2.2 },
        { size: '20U', quantity: 15, power_density_kw_per_u: 2.0 },
        { size: '18U', quantity: 10, power_density_kw_per_u: 1.8 },
      ],
      coolant_type: 'mineral_oil',
      pumping_efficiency: 0.94,
      heat_exchanger_efficiency: 0.96,
      cooling_efficiency: 0.99,
      maintenance_factor: 0.80,
    },
    financial: {
      analysis_years: 7,
      discount_rate: 0.10,
      currency: 'EUR',
      region: 'EU',
      custom_energy_cost: 0.25,
      energy_escalation_rate: 0.04,
      maintenance_escalation_rate: 0.03,
      custom_labor_cost: 90,
    },
  }),

  // Regional configuration variations
  createRegionalConfigurations: () => ({
    US: sharedTestUtils.createValidConfiguration({
      financial: { region: 'US', currency: 'USD', energy_cost_kwh: 0.12 },
    }),
    EU: sharedTestUtils.createValidConfiguration({
      financial: { region: 'EU', currency: 'EUR', energy_cost_kwh: 0.20 },
    }),
    ME: sharedTestUtils.createValidConfiguration({
      financial: { region: 'ME', currency: 'SAR', energy_cost_kwh: 0.08 },
    }),
  }),

  // Invalid configurations for validation testing
  createInvalidConfigurations: () => ({
    missingAirCooling: {
      immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 150 },
      financial: { analysis_years: 5, currency: 'USD' },
    } as any,

    missingImmersionCooling: {
      air_cooling: { input_method: 'rack_count', rack_count: 10, power_per_rack_kw: 15 },
      financial: { analysis_years: 5, currency: 'USD' },
    } as any,

    missingFinancial: {
      air_cooling: { input_method: 'rack_count', rack_count: 10, power_per_rack_kw: 15 },
      immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 150 },
    } as any,

    invalidRackCount: sharedTestUtils.createValidConfiguration({
      air_cooling: { rack_count: 0 }, // Invalid: must be > 0
    }),

    invalidPowerPerRack: sharedTestUtils.createValidConfiguration({
      air_cooling: { power_per_rack_kw: 100 }, // Invalid: too high
    }),

    invalidAnalysisYears: sharedTestUtils.createValidConfiguration({
      financial: { analysis_years: 15 }, // Invalid: max is 10
    }),

    invalidCurrency: sharedTestUtils.createValidConfiguration({
      financial: { currency: 'XYZ' as any }, // Invalid currency
    }),

    invalidTotalPower: sharedTestUtils.createValidConfiguration({
      air_cooling: { input_method: 'total_power', total_power_kw: 100000 }, // Exceeds maximum
    }),

    emptyTankConfigurations: sharedTestUtils.createValidConfiguration({
      immersion_cooling: {
        input_method: 'manual_config',
        tank_configurations: [], // Invalid: empty array
      },
    }),
  }),

  // Performance testing utilities
  measureCalculationTime: async <T>(
    name: string,
    calculationFn: () => T | Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const markName = `calc-${name}-${Date.now()}`;
    const startTime = performance.now();
    
    performanceMarks.push({ name: markName, startTime });
    
    try {
      const result = await calculationFn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Update performance mark
      const mark = performanceMarks.find(m => m.name === markName);
      if (mark) {
        mark.endTime = endTime;
        mark.duration = duration;
      }
      
      return { result, duration };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const mark = performanceMarks.find(m => m.name === markName);
      if (mark) {
        mark.endTime = endTime;
        mark.duration = duration;
      }
      
      throw error;
    }
  },

  // Memory usage tracking
  measureMemoryUsage: <T>(name: string, fn: () => T): { result: T; memoryDelta: number } => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = process.memoryUsage();
    const result = fn();
    
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
    
    console.log(`Memory usage for ${name}: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    
    return { result, memoryDelta };
  },

  // Validation testing utilities
  validateCalculationResult: (results: CalculationResults, config: CalculationConfiguration): boolean => {
    const errors: string[] = [];
    
    // Validate required properties
    if (!results.summary) errors.push('Missing summary');
    if (!results.breakdown) errors.push('Missing breakdown');
    if (!results.environmental) errors.push('Missing environmental');
    if (!results.charts) errors.push('Missing charts');
    if (!results.calculation_id) errors.push('Missing calculation_id');
    
    // Validate summary values
    if (results.summary) {
      if (typeof results.summary.total_tco_savings_5yr !== 'number') {
        errors.push('Invalid total_tco_savings_5yr type');
      }
      if (results.summary.roi_percent < 0) {
        errors.push('ROI cannot be negative');
      }
      if (results.summary.payback_months < 0) {
        errors.push('Payback period cannot be negative');
      }
    }
    
    // Validate breakdown structure
    if (results.breakdown) {
      if (!results.breakdown.capex) errors.push('Missing CAPEX breakdown');
      if (!results.breakdown.opex_annual) errors.push('Missing OPEX breakdown');
      if (results.breakdown.opex_annual?.length !== config.financial.analysis_years) {
        errors.push('OPEX breakdown length mismatch');
      }
    }
    
    // Validate charts data
    if (results.charts) {
      if (!results.charts.tco_progression) errors.push('Missing TCO progression chart data');
      if (!results.charts.pue_comparison) errors.push('Missing PUE comparison chart data');
      if (results.charts.tco_progression?.length !== config.financial.analysis_years) {
        errors.push('Chart data length mismatch');
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Calculation result validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  },

  // Comparison utilities
  compareCalculationResults: (
    result1: CalculationResults,
    result2: CalculationResults,
    tolerance: number = 0.01
  ): { equal: boolean; differences: string[] } => {
    const differences: string[] = [];
    
    // Compare key financial metrics
    const metrics = [
      'total_tco_savings_5yr',
      'total_capex_savings',
      'total_opex_savings_5yr',
      'roi_percent',
    ];
    
    metrics.forEach(metric => {
      const value1 = result1.summary[metric];
      const value2 = result2.summary[metric];
      
      if (typeof value1 === 'number' && typeof value2 === 'number') {
        const percentDiff = Math.abs((value1 - value2) / value1);
        if (percentDiff > tolerance) {
          differences.push(`${metric}: ${value1} vs ${value2} (${(percentDiff * 100).toFixed(2)}% difference)`);
        }
      }
    });
    
    return {
      equal: differences.length === 0,
      differences,
    };
  },

  // Benchmark data generators
  generateBenchmarkScenarios: () => ({
    small: {
      name: 'Small Data Center (10 racks)',
      config: sharedTestUtils.createValidConfiguration({
        air_cooling: { rack_count: 10, power_per_rack_kw: 15 },
        immersion_cooling: { target_power_kw: 150 },
      }),
      expectedRanges: {
        totalSavings: { min: 50000, max: 200000 },
        roi: { min: 10, max: 40 },
        paybackMonths: { min: 24, max: 60 },
      },
    },
    
    medium: {
      name: 'Medium Data Center (50 racks)',
      config: sharedTestUtils.createValidConfiguration({
        air_cooling: { rack_count: 50, power_per_rack_kw: 15 },
        immersion_cooling: { target_power_kw: 750 },
      }),
      expectedRanges: {
        totalSavings: { min: 200000, max: 800000 },
        roi: { min: 15, max: 45 },
        paybackMonths: { min: 18, max: 48 },
      },
    },
    
    large: {
      name: 'Large Data Center (200 racks)',
      config: sharedTestUtils.createValidConfiguration({
        air_cooling: { rack_count: 200, power_per_rack_kw: 20 },
        immersion_cooling: { target_power_kw: 4000 },
      }),
      expectedRanges: {
        totalSavings: { min: 800000, max: 3000000 },
        roi: { min: 25, max: 60 },
        paybackMonths: { min: 12, max: 36 },
      },
    },
  }),

  // Currency and localization testing
  createMultiCurrencyTests: () => {
    const baseTcoSavings = 100000; // Base USD amount
    const exchangeRates = { USD_EUR: 0.85, USD_SAR: 3.75, USD_AED: 3.67 };
    
    return [
      {
        currency: 'USD',
        expectedSavings: baseTcoSavings,
        config: sharedTestUtils.createValidConfiguration({ financial: { currency: 'USD', region: 'US' } }),
      },
      {
        currency: 'EUR',
        expectedSavings: baseTcoSavings * exchangeRates.USD_EUR,
        config: sharedTestUtils.createValidConfiguration({ financial: { currency: 'EUR', region: 'EU' } }),
      },
      {
        currency: 'SAR',
        expectedSavings: baseTcoSavings * exchangeRates.USD_SAR,
        config: sharedTestUtils.createValidConfiguration({ financial: { currency: 'SAR', region: 'ME' } }),
      },
      {
        currency: 'AED',
        expectedSavings: baseTcoSavings * exchangeRates.USD_AED,
        config: sharedTestUtils.createValidConfiguration({ financial: { currency: 'AED', region: 'ME' } }),
      },
    ];
  },

  // Math precision testing
  testNumericPrecision: (value: number, expectedPrecision: number): boolean => {
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    return decimalPlaces <= expectedPrecision;
  },

  // Environment-specific test data
  getTestEnvironmentConfig: () => ({
    isDevelopment: process.env.NODE_ENV === 'development',
    isTesting: process.env.NODE_ENV === 'test',
    isProduction: process.env.NODE_ENV === 'production',
    timeoutMs: process.env.NODE_ENV === 'test' ? 5000 : 10000,
    logLevel: process.env.NODE_ENV === 'test' ? 'error' : 'info',
  }),
};

// Add global shared test utilities
global.sharedTestUtils = sharedTestUtils;

declare global {
  var sharedTestUtils: typeof sharedTestUtils;
}