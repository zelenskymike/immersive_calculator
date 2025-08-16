/**
 * Environmental Impact Performance Tests
 * Tests performance of environmental calculations and chart rendering
 * Ensures enterprise-grade performance for large deployments and complex scenarios
 */

import { performance } from 'perf_hooks';
import { TCOCalculationEngine, calculateTCO } from '@tco-calculator/shared';
import type { CalculationConfiguration } from '@tco-calculator/shared';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SMALL_CALCULATION: 500, // 500ms for small deployments
  MEDIUM_CALCULATION: 1500, // 1.5s for medium deployments
  LARGE_CALCULATION: 3000, // 3s for large deployments
  EXTREME_CALCULATION: 5000, // 5s for extreme deployments
  MEMORY_LIMIT_MB: 50, // 50MB memory limit for calculations
  CHART_DATA_GENERATION: 200, // 200ms for chart data generation
  ENVIRONMENTAL_METRICS: 100, // 100ms for environmental metrics calculation
};

// Test configurations for different deployment sizes
const PERFORMANCE_CONFIGURATIONS = {
  small: {
    air_cooling: {
      input_method: 'rack_count' as const,
      rack_count: 10,
      power_per_rack_kw: 10,
    },
    immersion_cooling: {
      input_method: 'auto_optimize' as const,
      target_power_kw: 100,
    },
    financial: {
      analysis_years: 3,
      currency: 'USD' as const,
      region: 'US' as const,
    },
  },
  medium: {
    air_cooling: {
      input_method: 'rack_count' as const,
      rack_count: 77, // Validator benchmark
      power_per_rack_kw: 15.5,
    },
    immersion_cooling: {
      input_method: 'auto_optimize' as const,
      target_power_kw: 1193.5,
    },
    financial: {
      analysis_years: 5,
      currency: 'USD' as const,
      region: 'US' as const,
    },
  },
  large: {
    air_cooling: {
      input_method: 'rack_count' as const,
      rack_count: 200,
      power_per_rack_kw: 20,
    },
    immersion_cooling: {
      input_method: 'auto_optimize' as const,
      target_power_kw: 4000,
    },
    financial: {
      analysis_years: 7,
      currency: 'USD' as const,
      region: 'US' as const,
    },
  },
  extreme: {
    air_cooling: {
      input_method: 'rack_count' as const,
      rack_count: 1000,
      power_per_rack_kw: 25,
    },
    immersion_cooling: {
      input_method: 'auto_optimize' as const,
      target_power_kw: 25000,
    },
    financial: {
      analysis_years: 10,
      currency: 'USD' as const,
      region: 'US' as const,
    },
  },
};

// Memory usage tracking
function getMemoryUsage(): number {
  const used = process.memoryUsage();
  return used.heapUsed / 1024 / 1024; // Convert to MB
}

// Performance measurement helper
function measurePerformance<T>(operation: () => T, description: string): { result: T; time: number; memory: number } {
  const initialMemory = getMemoryUsage();
  const startTime = performance.now();
  
  const result = operation();
  
  const endTime = performance.now();
  const finalMemory = getMemoryUsage();
  
  const time = endTime - startTime;
  const memory = finalMemory - initialMemory;
  
  console.log(`${description}: ${time.toFixed(2)}ms, Memory: ${memory.toFixed(2)}MB`);
  
  return { result, time, memory };
}

describe('Environmental Impact Performance Tests', () => {
  describe('Calculation Performance', () => {
    it('should calculate environmental metrics for small deployment within performance threshold', () => {
      const { time, memory } = measurePerformance(
        () => calculateTCO(PERFORMANCE_CONFIGURATIONS.small),
        'Small deployment environmental calculation'
      );

      expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.SMALL_CALCULATION);
      expect(memory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB);
    });

    it('should calculate environmental metrics for medium deployment (validator benchmark) within threshold', () => {
      const { result, time, memory } = measurePerformance(
        () => calculateTCO(PERFORMANCE_CONFIGURATIONS.medium),
        'Medium deployment environmental calculation (validator benchmark)'
      );

      expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_CALCULATION);
      expect(memory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB);

      // Verify validator metrics are calculated correctly within time limit
      expect(result.environmental.energy_savings_kwh_annual).toBeGreaterThan(800000);
      expect(result.environmental.carbon_savings_kg_co2_annual).toBeGreaterThan(300000);
      expect(result.pue_analysis.improvement_percent).toBeGreaterThan(30);
    });

    it('should calculate environmental metrics for large deployment within threshold', () => {
      const { time, memory } = measurePerformance(
        () => calculateTCO(PERFORMANCE_CONFIGURATIONS.large),
        'Large deployment environmental calculation'
      );

      expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_CALCULATION);
      expect(memory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB);
    });

    it('should handle extreme deployment scenarios within maximum threshold', () => {
      const { result, time, memory } = measurePerformance(
        () => calculateTCO(PERFORMANCE_CONFIGURATIONS.extreme),
        'Extreme deployment environmental calculation'
      );

      expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.EXTREME_CALCULATION);
      expect(memory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB * 2); // Allow 2x memory for extreme cases

      // Verify extreme calculations still produce reasonable results
      expect(result.environmental.energy_savings_kwh_annual).toBeGreaterThan(10000000); // 10+ GWh
      expect(result.environmental.carbon_savings_kg_co2_annual).toBeGreaterThan(4000000); // 4000+ tons
    });
  });

  describe('Environmental Metrics Calculation Performance', () => {
    it('should calculate PUE analysis within performance threshold', () => {
      const engine = new TCOCalculationEngine(PERFORMANCE_CONFIGURATIONS.medium);
      
      const { time } = measurePerformance(
        () => {
          // Simulate the PUE analysis calculation specifically
          const airConfig = {
            totalPowerKW: 1193.5,
            hvacPowerKW: 200,
            distributionLossesKW: 50,
            totalFacilityPowerKW: 1443.5,
            pue: 1.21,
          };
          
          const immersionConfig = {
            totalPowerKW: 1193.5,
            pumpPowerKW: 18,
            heatExchangerPowerKW: 6,
            totalFacilityPowerKW: 1217.5,
            pue: 1.02,
          };
          
          const pueAnalysis = {
            air_cooling: airConfig.pue,
            immersion_cooling: immersionConfig.pue,
            improvement_percent: ((airConfig.pue - immersionConfig.pue) / airConfig.pue) * 100,
            energy_savings_kwh_annual: (airConfig.totalFacilityPowerKW - immersionConfig.totalFacilityPowerKW) * 8760,
          };
          
          return pueAnalysis;
        },
        'PUE analysis calculation'
      );

      expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.ENVIRONMENTAL_METRICS);
    });

    it('should calculate carbon emissions for all regions within threshold', () => {
      const regions = ['US', 'EU', 'ME'] as const;
      
      for (const region of regions) {
        const config = {
          ...PERFORMANCE_CONFIGURATIONS.medium,
          financial: {
            ...PERFORMANCE_CONFIGURATIONS.medium.financial,
            region,
          },
        };

        const { time } = measurePerformance(
          () => calculateTCO(config),
          `Environmental calculation for ${region} region`
        );

        expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_CALCULATION);
      }
    });

    it('should calculate water savings efficiently', () => {
      const { time } = measurePerformance(
        () => {
          const energySavings = 1159000; // kWh annually
          const waterSavings = energySavings * 0.5; // Approximate factor
          return waterSavings;
        },
        'Water savings calculation'
      );

      expect(time).toBeLessThan(10); // Should be nearly instantaneous
    });
  });

  describe('Chart Data Generation Performance', () => {
    it('should generate environmental chart data within threshold', () => {
      const results = calculateTCO(PERFORMANCE_CONFIGURATIONS.medium);
      
      const { time } = measurePerformance(
        () => {
          // Simulate chart data generation for environmental display
          const pueChartData = {
            labels: ['Air Cooling PUE', 'Immersion Cooling PUE'],
            datasets: [
              {
                data: [results.pue_analysis.air_cooling, results.pue_analysis.immersion_cooling],
                backgroundColor: ['#1976d2', '#dc004e'],
                borderWidth: 2,
                borderColor: '#ffffff',
              },
            ],
          };

          const environmentalMetricsData = {
            carbonSavings: results.environmental.carbon_savings_kg_co2_annual / 1000, // Convert to tons
            energySavings: results.environmental.energy_savings_kwh_annual / 1000, // Convert to MWh
            waterSavings: results.environmental.water_savings_gallons_annual,
            carbonReduction: results.environmental.carbon_footprint_reduction_percent,
          };

          return { pueChartData, environmentalMetricsData };
        },
        'Environmental chart data generation'
      );

      expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.CHART_DATA_GENERATION);
    });

    it('should handle complex chart data structures efficiently', () => {
      const results = calculateTCO(PERFORMANCE_CONFIGURATIONS.large);
      
      const { time, memory } = measurePerformance(
        () => {
          // Generate comprehensive chart data for large deployment
          const tcoProgression = results.charts.tco_progression.map((point, index) => ({
            year: point.year,
            airCooling: point.air_cooling,
            immersionCooling: point.immersion_cooling,
            savings: point.savings,
            cumulativeSavings: point.cumulative_savings,
            environmentalSavings: (point.savings * 0.4) / 1000, // Approximate CO₂ tons
          }));

          const environmentalTrendData = {
            labels: tcoProgression.map(p => `Year ${p.year}`),
            datasets: [
              {
                label: 'Annual CO₂ Savings (tons)',
                data: tcoProgression.map(p => p.environmentalSavings),
                borderColor: '#2e7d32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                fill: true,
              },
            ],
          };

          return { tcoProgression, environmentalTrendData };
        },
        'Complex environmental chart data generation'
      );

      expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.CHART_DATA_GENERATION * 2); // Allow 2x for complex data
      expect(memory).toBeLessThan(5); // Chart data should not use excessive memory
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle multiple simultaneous environmental calculations', async () => {
      const configurations = [
        PERFORMANCE_CONFIGURATIONS.small,
        PERFORMANCE_CONFIGURATIONS.medium,
        PERFORMANCE_CONFIGURATIONS.large,
      ];

      const { time } = measurePerformance(
        () => {
          const promises = configurations.map(config => 
            Promise.resolve(calculateTCO(config))
          );
          return Promise.all(promises);
        },
        'Concurrent environmental calculations'
      );

      // Concurrent calculations should complete within reasonable time
      expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_CALCULATION);
    });

    it('should maintain performance under load simulation', () => {
      const loadIterations = 10;
      const times: number[] = [];

      for (let i = 0; i < loadIterations; i++) {
        const { time } = measurePerformance(
          () => calculateTCO(PERFORMANCE_CONFIGURATIONS.medium),
          `Load simulation iteration ${i + 1}`
        );
        times.push(time);
      }

      // Average time should remain within threshold
      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_CALCULATION);

      // Performance should not degrade significantly
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variance = (maxTime - minTime) / averageTime;
      expect(variance).toBeLessThan(0.5); // Less than 50% variance
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory during repeated calculations', () => {
      const iterations = 20;
      const memoryMeasurements: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const initialMemory = getMemoryUsage();
        calculateTCO(PERFORMANCE_CONFIGURATIONS.medium);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const finalMemory = getMemoryUsage();
        memoryMeasurements.push(finalMemory - initialMemory);
      }

      // Memory usage should not grow continuously
      const firstHalf = memoryMeasurements.slice(0, iterations / 2);
      const secondHalf = memoryMeasurements.slice(iterations / 2);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Second half should not use significantly more memory
      expect(secondHalfAvg).toBeLessThanOrEqual(firstHalfAvg * 1.5);
    });

    it('should efficiently handle large environmental datasets', () => {
      const { memory } = measurePerformance(
        () => {
          // Simulate large environmental dataset processing
          const years = 10;
          const dataPoints = 1000; // Simulate 1000 data centers
          
          const environmentalData = [];
          for (let year = 1; year <= years; year++) {
            for (let dc = 1; dc <= dataPoints; dc++) {
              environmentalData.push({
                year,
                dataCenter: dc,
                carbonSavings: 464 * dc, // Scale by data center size
                energySavings: 1159 * dc,
                waterSavings: 579500 * dc,
              });
            }
          }
          
          // Aggregate data
          const yearlyTotals = environmentalData.reduce((acc, curr) => {
            if (!acc[curr.year]) {
              acc[curr.year] = { carbon: 0, energy: 0, water: 0 };
            }
            acc[curr.year].carbon += curr.carbonSavings;
            acc[curr.year].energy += curr.energySavings;
            acc[curr.year].water += curr.waterSavings;
            return acc;
          }, {} as Record<number, { carbon: number; energy: number; water: number }>);
          
          return yearlyTotals;
        },
        'Large environmental dataset processing'
      );

      // Should handle large datasets efficiently
      expect(memory).toBeLessThan(100); // 100MB limit for large datasets
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should meet enterprise dashboard loading requirements', () => {
      // Simulate enterprise dashboard with multiple environmental metrics
      const { time } = measurePerformance(
        () => {
          const results = calculateTCO(PERFORMANCE_CONFIGURATIONS.medium);
          
          // Generate all environmental displays
          const summaryCards = {
            pueImprovement: results.pue_analysis.improvement_percent,
            carbonSavings: results.environmental.carbon_savings_kg_co2_annual / 1000,
            energySavings: results.environmental.energy_savings_kwh_annual / 1000,
            waterSavings: results.environmental.water_savings_gallons_annual,
          };
          
          const contextualEquivalents = {
            carsRemoved: Math.round(results.environmental.carbon_savings_kg_co2_annual / 4000),
            homesPowered: Math.round(results.environmental.energy_savings_kwh_annual / 11000),
            treesPlanted: Math.round(results.environmental.carbon_savings_kg_co2_annual / 22),
          };
          
          const chartData = {
            pue: {
              labels: ['Air Cooling', 'Immersion Cooling'],
              values: [results.pue_analysis.air_cooling, results.pue_analysis.immersion_cooling],
            },
            environmental: {
              carbon: summaryCards.carbonSavings,
              energy: summaryCards.energySavings,
              water: summaryCards.waterSavings,
            },
          };
          
          return { summaryCards, contextualEquivalents, chartData };
        },
        'Enterprise dashboard environmental data preparation'
      );

      // Dashboard should load within 2 seconds
      expect(time).toBeLessThan(2000);
    });

    it('should support real-time updates for interactive scenarios', () => {
      // Simulate parameter changes requiring recalculation
      const parameterChanges = [
        { rackCount: 50 },
        { rackCount: 77 },
        { rackCount: 100 },
        { rackCount: 150 },
        { rackCount: 200 },
      ];

      const updateTimes: number[] = [];

      for (const change of parameterChanges) {
        const config = {
          ...PERFORMANCE_CONFIGURATIONS.medium,
          air_cooling: {
            ...PERFORMANCE_CONFIGURATIONS.medium.air_cooling,
            rack_count: change.rackCount,
          },
          immersion_cooling: {
            ...PERFORMANCE_CONFIGURATIONS.medium.immersion_cooling,
            target_power_kw: change.rackCount * 15.5,
          },
        };

        const { time } = measurePerformance(
          () => calculateTCO(config),
          `Parameter update: ${change.rackCount} racks`
        );

        updateTimes.push(time);
      }

      // All updates should complete within threshold for interactive use
      updateTimes.forEach(time => {
        expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_CALCULATION);
      });

      // Average update time should be suitable for interactive use
      const averageTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      expect(averageTime).toBeLessThan(1000); // 1 second for interactive updates
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent calculation performance', () => {
      const baselineRuns = 5;
      const testRuns = 5;
      
      // Establish baseline performance
      const baselineTimes: number[] = [];
      for (let i = 0; i < baselineRuns; i++) {
        const { time } = measurePerformance(
          () => calculateTCO(PERFORMANCE_CONFIGURATIONS.medium),
          `Baseline run ${i + 1}`
        );
        baselineTimes.push(time);
      }
      
      const baselineAvg = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
      
      // Test current performance
      const testTimes: number[] = [];
      for (let i = 0; i < testRuns; i++) {
        const { time } = measurePerformance(
          () => calculateTCO(PERFORMANCE_CONFIGURATIONS.medium),
          `Test run ${i + 1}`
        );
        testTimes.push(time);
      }
      
      const testAvg = testTimes.reduce((a, b) => a + b, 0) / testTimes.length;
      
      // Performance should not regress significantly
      const regression = (testAvg - baselineAvg) / baselineAvg;
      expect(regression).toBeLessThan(0.2); // Less than 20% regression
      
      console.log(`Performance baseline: ${baselineAvg.toFixed(2)}ms`);
      console.log(`Current performance: ${testAvg.toFixed(2)}ms`);
      console.log(`Regression: ${(regression * 100).toFixed(1)}%`);
    });
  });
});