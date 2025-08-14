/**
 * Performance tests for TCO calculation engine and API endpoints
 * Validates calculation speed, memory usage, and scalability requirements
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { jest } from '@jest/globals';
import { TCOCalculationEngine, calculateTCO } from '@tco-calculator/shared';
import type { CalculationConfiguration } from '@tco-calculator/shared';

// Mock heavy dependencies for isolated performance testing
jest.mock('../../packages/backend/src/config/database', () => ({
  redis: {
    getClient: () => ({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    }),
  },
}));

describe('Calculation Performance Tests', () => {
  let performanceObserver: PerformanceObserver;
  let performanceMarks: { name: string; duration: number }[] = [];

  beforeAll(() => {
    // Set up performance monitoring
    performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          performanceMarks.push({
            name: entry.name,
            duration: entry.duration,
          });
        }
      });
    });
    performanceObserver.observe({ entryTypes: ['measure'] });
  });

  afterAll(() => {
    performanceObserver.disconnect();
  });

  beforeEach(() => {
    performanceMarks = [];
    performance.clearMarks();
    performance.clearMeasures();
  });

  describe('Core Calculation Engine Performance', () => {
    const createTestConfiguration = (complexity: 'simple' | 'medium' | 'complex'): CalculationConfiguration => {
      const baseConfig: CalculationConfiguration = {
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
          currency: 'USD',
          region: 'US',
        },
      };

      switch (complexity) {
        case 'simple':
          return {
            ...baseConfig,
            financial: { ...baseConfig.financial, analysis_years: 1 },
          };
        
        case 'medium':
          return {
            ...baseConfig,
            air_cooling: { ...baseConfig.air_cooling, rack_count: 50 },
            immersion_cooling: { ...baseConfig.immersion_cooling, target_power_kw: 750 },
            financial: { ...baseConfig.financial, analysis_years: 5 },
          };
        
        case 'complex':
          return {
            ...baseConfig,
            air_cooling: { ...baseConfig.air_cooling, rack_count: 500 },
            immersion_cooling: {
              input_method: 'manual_config',
              tank_configurations: [
                { size: '23U', quantity: 50, power_density_kw_per_u: 2.0 },
                { size: '20U', quantity: 30, power_density_kw_per_u: 2.0 },
                { size: '18U', quantity: 20, power_density_kw_per_u: 2.0 },
                { size: '16U', quantity: 15, power_density_kw_per_u: 2.0 },
                { size: '14U', quantity: 10, power_density_kw_per_u: 2.0 },
              ],
              coolant_type: 'synthetic',
              pumping_efficiency: 0.92,
              heat_exchanger_efficiency: 0.95,
            },
            financial: { ...baseConfig.financial, analysis_years: 10 },
          };
      }
    };

    test('should complete simple calculation within 100ms', () => {
      const config = createTestConfiguration('simple');
      
      performance.mark('simple-calc-start');
      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();
      performance.mark('simple-calc-end');
      performance.measure('simple-calculation', 'simple-calc-start', 'simple-calc-end');
      
      expect(results).toBeDefined();
      expect(results.summary).toBeDefined();
      
      const measurement = performanceMarks.find(m => m.name === 'simple-calculation');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(100); // 100ms requirement
    });

    test('should complete medium calculation within 500ms', () => {
      const config = createTestConfiguration('medium');
      
      performance.mark('medium-calc-start');
      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();
      performance.mark('medium-calc-end');
      performance.measure('medium-calculation', 'medium-calc-start', 'medium-calc-end');
      
      expect(results).toBeDefined();
      expect(results.summary.total_tco_savings_5yr).toBeGreaterThan(0);
      
      const measurement = performanceMarks.find(m => m.name === 'medium-calculation');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(500); // 500ms requirement
    });

    test('should complete complex calculation within 1000ms', () => {
      const config = createTestConfiguration('complex');
      
      performance.mark('complex-calc-start');
      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();
      performance.mark('complex-calc-end');
      performance.measure('complex-calculation', 'complex-calc-start', 'complex-calc-end');
      
      expect(results).toBeDefined();
      expect(results.breakdown.opex_annual).toHaveLength(10);
      
      const measurement = performanceMarks.find(m => m.name === 'complex-calculation');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(1000); // 1000ms requirement
    });

    test('should handle multiple concurrent calculations efficiently', async () => {
      const config = createTestConfiguration('medium');
      const concurrentCount = 10;
      
      performance.mark('concurrent-calc-start');
      
      const promises = Array(concurrentCount).fill(null).map(async (_, index) => {
        const startTime = performance.now();
        const engine = new TCOCalculationEngine(config);
        const results = engine.calculate();
        const endTime = performance.now();
        
        return {
          index,
          results,
          duration: endTime - startTime,
        };
      });
      
      const results = await Promise.all(promises);
      
      performance.mark('concurrent-calc-end');
      performance.measure('concurrent-calculations', 'concurrent-calc-start', 'concurrent-calc-end');
      
      // All calculations should complete successfully
      results.forEach((result, index) => {
        expect(result.results).toBeDefined();
        expect(result.results.summary).toBeDefined();
        expect(result.duration).toBeLessThan(1000); // Each calculation under 1s
      });
      
      // Total time for all concurrent calculations should be reasonable
      const totalMeasurement = performanceMarks.find(m => m.name === 'concurrent-calculations');
      expect(totalMeasurement).toBeDefined();
      expect(totalMeasurement!.duration).toBeLessThan(2000); // 2s for 10 concurrent
    });

    test('should scale linearly with analysis years', () => {
      const baseConfig = createTestConfiguration('medium');
      const yearCounts = [1, 3, 5, 7, 10];
      const measurements: { years: number; duration: number }[] = [];
      
      yearCounts.forEach(years => {
        const config = {
          ...baseConfig,
          financial: { ...baseConfig.financial, analysis_years: years },
        };
        
        const startTime = performance.now();
        const engine = new TCOCalculationEngine(config);
        const results = engine.calculate();
        const endTime = performance.now();
        
        measurements.push({
          years,
          duration: endTime - startTime,
        });
        
        expect(results.breakdown.opex_annual).toHaveLength(years);
      });
      
      // Verify roughly linear scaling (duration shouldn't increase exponentially)
      const durationPer1Year = measurements[0].duration;
      const durationPer10Years = measurements[4].duration;
      
      // 10-year calculation should not be more than 3x slower than 1-year
      expect(durationPer10Years).toBeLessThan(durationPer1Year * 3);
    });

    test('should maintain consistent performance across repeated calculations', () => {
      const config = createTestConfiguration('medium');
      const iterations = 20;
      const durations: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const engine = new TCOCalculationEngine(config);
        const results = engine.calculate();
        const endTime = performance.now();
        
        durations.push(endTime - startTime);
        expect(results).toBeDefined();
      }
      
      // Calculate statistics
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      // Performance should be consistent (max not more than 2x avg)
      expect(maxDuration).toBeLessThan(avgDuration * 2);
      expect(avgDuration).toBeLessThan(500); // Average under 500ms
      
      // No outliers (95% of calculations within 2x average)
      const outliers = durations.filter(d => d > avgDuration * 2);
      expect(outliers.length).toBeLessThan(iterations * 0.05); // Less than 5% outliers
    });
  });

  describe('Memory Usage Performance', () => {
    test('should not have memory leaks during repeated calculations', () => {
      const config = createTestConfiguration('medium');
      const iterations = 100;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage();
      
      for (let i = 0; i < iterations; i++) {
        const engine = new TCOCalculationEngine(config);
        const results = engine.calculate();
        
        // Clear reference to allow garbage collection
        results;
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory growth should be minimal (less than 10MB for 100 calculations)
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
    });

    test('should handle large datasets efficiently', () => {
      const largeConfig = createTestConfiguration('complex');
      
      const initialMemory = process.memoryUsage();
      
      performance.mark('large-dataset-start');
      const engine = new TCOCalculationEngine(largeConfig);
      const results = engine.calculate();
      performance.mark('large-dataset-end');
      performance.measure('large-dataset', 'large-dataset-start', 'large-dataset-end');
      
      const finalMemory = process.memoryUsage();
      
      expect(results).toBeDefined();
      expect(results.breakdown.opex_annual).toHaveLength(10);
      
      // Memory usage should be reasonable (less than 50MB for complex calculation)
      const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
      
      // Should complete within time limit
      const measurement = performanceMarks.find(m => m.name === 'large-dataset');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(1000);
    });
  });

  describe('Calculation Engine Component Performance', () => {
    test('should perform CAPEX calculations efficiently', () => {
      const config = createTestConfiguration('complex');
      const engine = new TCOCalculationEngine(config);
      
      performance.mark('capex-calc-start');
      
      // Access private method through any for testing
      const capexResults = (engine as any).calculateCapex();
      
      performance.mark('capex-calc-end');
      performance.measure('capex-calculation', 'capex-calc-start', 'capex-calc-end');
      
      expect(capexResults.air_cooling.total).toBeGreaterThan(0);
      expect(capexResults.immersion_cooling.total).toBeGreaterThan(0);
      
      const measurement = performanceMarks.find(m => m.name === 'capex-calculation');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(50); // CAPEX should be very fast
    });

    test('should perform OPEX calculations efficiently', () => {
      const config = createTestConfiguration('complex');
      const engine = new TCOCalculationEngine(config);
      
      performance.mark('opex-calc-start');
      
      // Calculate OPEX for all years
      const opexResults = (engine as any).calculateOpex();
      
      performance.mark('opex-calc-end');
      performance.measure('opex-calculation', 'opex-calc-start', 'opex-calc-end');
      
      expect(opexResults).toHaveLength(10);
      expect(opexResults[0].air_cooling.total).toBeGreaterThan(0);
      
      const measurement = performanceMarks.find(m => m.name === 'opex-calculation');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(100); // OPEX calculation should be fast
    });

    test('should generate chart data efficiently', () => {
      const config = createTestConfiguration('complex');
      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();
      
      performance.mark('chart-data-start');
      
      // Chart data is generated as part of main calculation
      const chartData = results.charts;
      
      performance.mark('chart-data-end');
      performance.measure('chart-data-generation', 'chart-data-start', 'chart-data-end');
      
      expect(chartData.tco_progression).toHaveLength(10);
      expect(chartData.cost_categories).toBeDefined();
      expect(chartData.pue_comparison).toBeDefined();
      
      const measurement = performanceMarks.find(m => m.name === 'chart-data-generation');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(10); // Chart data generation should be very fast
    });
  });

  describe('Edge Case Performance', () => {
    test('should handle minimum configuration efficiently', () => {
      const minConfig: CalculationConfiguration = {
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
      };
      
      performance.mark('min-config-start');
      const results = calculateTCO(minConfig);
      performance.mark('min-config-end');
      performance.measure('min-configuration', 'min-config-start', 'min-config-end');
      
      expect(results).toBeDefined();
      expect(results.summary.total_tco_savings_5yr).toBeDefined();
      
      const measurement = performanceMarks.find(m => m.name === 'min-configuration');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(50); // Minimal config should be very fast
    });

    test('should handle maximum configuration within limits', () => {
      const maxConfig: CalculationConfiguration = {
        air_cooling: {
          input_method: 'total_power',
          total_power_kw: 50000, // Maximum allowed
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 50000,
        },
        financial: {
          analysis_years: 10, // Maximum years
          currency: 'USD',
        },
      };
      
      performance.mark('max-config-start');
      const results = calculateTCO(maxConfig);
      performance.mark('max-config-end');
      performance.measure('max-configuration', 'max-config-start', 'max-config-end');
      
      expect(results).toBeDefined();
      expect(results.breakdown.opex_annual).toHaveLength(10);
      
      const measurement = performanceMarks.find(m => m.name === 'max-configuration');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(2000); // Maximum config under 2s
    });

    test('should handle zero-cost scenarios efficiently', () => {
      const zeroConfig: CalculationConfiguration = {
        air_cooling: {
          input_method: 'rack_count',
          rack_count: 1,
          power_per_rack_kw: 0.1,
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 0.1,
        },
        financial: {
          analysis_years: 1,
          currency: 'USD',
          custom_energy_cost: 0.01, // Very low cost
        },
      };
      
      performance.mark('zero-cost-start');
      const results = calculateTCO(zeroConfig);
      performance.mark('zero-cost-end');
      performance.measure('zero-cost-scenario', 'zero-cost-start', 'zero-cost-end');
      
      expect(results).toBeDefined();
      expect(results.summary.total_tco_savings_5yr).toBeDefined();
      
      const measurement = performanceMarks.find(m => m.name === 'zero-cost-scenario');
      expect(measurement).toBeDefined();
      expect(measurement!.duration).toBeLessThan(100);
    });
  });

  describe('Performance Regression Tests', () => {
    test('should maintain baseline performance benchmarks', () => {
      const benchmarkConfig = createTestConfiguration('medium');
      const iterations = 5;
      const durations: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const results = calculateTCO(benchmarkConfig);
        const endTime = performance.now();
        
        durations.push(endTime - startTime);
        expect(results).toBeDefined();
      }
      
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      // Baseline performance benchmarks (these would be adjusted based on target hardware)
      expect(avgDuration).toBeLessThan(300); // 300ms average for medium complexity
      
      // Consistency check
      const maxDuration = Math.max(...durations);
      expect(maxDuration).toBeLessThan(avgDuration * 1.5); // Max within 50% of average
    });

    test('should provide performance metrics for monitoring', () => {
      const config = createTestConfiguration('medium');
      
      const startTime = performance.now();
      const engine = new TCOCalculationEngine(config);
      const results = engine.calculate();
      const endTime = performance.now();
      
      const calculationTime = endTime - startTime;
      
      expect(results).toBeDefined();
      
      // Verify we can extract meaningful performance metrics
      expect(calculationTime).toBeGreaterThan(0);
      expect(calculationTime).toBeLessThan(1000);
      
      // In a real application, these metrics would be sent to monitoring systems
      const performanceMetrics = {
        calculation_time_ms: calculationTime,
        configuration_complexity: 'medium',
        analysis_years: config.financial.analysis_years,
        rack_count: config.air_cooling.rack_count,
        memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024,
        timestamp: new Date().toISOString(),
      };
      
      expect(performanceMetrics.calculation_time_ms).toBeLessThan(500);
      expect(performanceMetrics.memory_usage_mb).toBeLessThan(100);
    });
  });
});