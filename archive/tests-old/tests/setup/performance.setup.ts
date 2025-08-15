/**
 * Performance testing setup configuration
 * Sets up performance monitoring, benchmarking, and load testing utilities
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { jest } from '@jest/globals';

// Performance monitoring setup
let performanceObserver: PerformanceObserver;
let performanceEntries: PerformanceEntry[] = [];
let memoryBaseline: NodeJS.MemoryUsage;

beforeAll(() => {
  // Initialize performance monitoring
  performanceObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    performanceEntries.push(...entries);
  });
  
  performanceObserver.observe({ 
    entryTypes: ['measure', 'mark', 'navigation', 'resource'] 
  });

  // Record memory baseline
  if (global.gc) {
    global.gc();
  }
  memoryBaseline = process.memoryUsage();
  
  console.log('Performance monitoring initialized');
  console.log(`Memory baseline: ${(memoryBaseline.heapUsed / 1024 / 1024).toFixed(2)}MB`);
});

afterAll(() => {
  if (performanceObserver) {
    performanceObserver.disconnect();
  }
  
  // Report final performance metrics
  if (performanceEntries.length > 0) {
    console.log('\n--- Performance Summary ---');
    console.log(`Total performance entries recorded: ${performanceEntries.length}`);
    
    const measures = performanceEntries.filter(entry => entry.entryType === 'measure');
    if (measures.length > 0) {
      console.log('Slowest operations:');
      measures
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .forEach(measure => {
          console.log(`  ${measure.name}: ${measure.duration.toFixed(2)}ms`);
        });
    }
    
    console.log('--- End Performance Summary ---\n');
  }
});

beforeEach(() => {
  // Clear performance data for each test
  performance.clearMarks();
  performance.clearMeasures();
  performanceEntries = [];
});

// Performance testing utilities
export const performanceTestUtils = {
  // Thresholds for different types of operations
  THRESHOLDS: {
    CALCULATION_ENGINE: {
      SIMPLE: 100,      // Simple calculations should complete within 100ms
      MEDIUM: 500,      // Medium complexity within 500ms
      COMPLEX: 1000,    // Complex calculations within 1000ms
      MAXIMUM: 2000,    // Maximum allowed time for any calculation
    },
    API_ENDPOINTS: {
      GET: 200,         // GET requests within 200ms
      POST: 500,        // POST requests within 500ms
      CALCULATION: 1000, // Calculation endpoints within 1000ms
    },
    DATABASE_OPERATIONS: {
      SELECT: 50,       // Simple selects within 50ms
      INSERT: 100,      // Inserts within 100ms
      UPDATE: 100,      // Updates within 100ms
      DELETE: 100,      // Deletes within 100ms
    },
    FRONTEND_RENDERING: {
      COMPONENT: 16,    // Component render within 16ms (60fps)
      CHART: 500,       // Chart rendering within 500ms
      PAGE_LOAD: 2000,  // Full page load within 2s
    },
    MEMORY_USAGE: {
      PER_CALCULATION: 10 * 1024 * 1024,    // 10MB per calculation
      TOTAL_GROWTH: 50 * 1024 * 1024,       // 50MB total growth
      LEAK_THRESHOLD: 5 * 1024 * 1024,      // 5MB considered a leak
    },
  },

  // Performance measurement wrapper
  measurePerformance: async <T>(
    operationName: string,
    operation: () => Promise<T> | T,
    expectedThreshold?: number
  ): Promise<{ result: T; duration: number; memoryUsage: number }> => {
    const markStart = `${operationName}-start`;
    const markEnd = `${operationName}-end`;
    const measureName = `${operationName}-duration`;

    // Record memory before operation
    if (global.gc) global.gc();
    const memoryBefore = process.memoryUsage();

    // Start performance measurement
    performance.mark(markStart);
    const startTime = performance.now();

    try {
      const result = await operation();
      
      // End performance measurement
      const endTime = performance.now();
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);
      
      // Record memory after operation
      if (global.gc) global.gc();
      const memoryAfter = process.memoryUsage();
      const memoryUsage = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      const duration = endTime - startTime;

      // Check against threshold if provided
      if (expectedThreshold && duration > expectedThreshold) {
        console.warn(`Performance warning: ${operationName} took ${duration.toFixed(2)}ms, expected < ${expectedThreshold}ms`);
      }

      // Log performance metrics
      console.log(`Performance: ${operationName} completed in ${duration.toFixed(2)}ms, memory: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);

      return { result, duration, memoryUsage };
    } catch (error) {
      const endTime = performance.now();
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);
      
      console.error(`Performance: ${operationName} failed after ${(endTime - startTime).toFixed(2)}ms`);
      throw error;
    }
  },

  // Concurrent performance testing
  measureConcurrentPerformance: async <T>(
    operationName: string,
    operation: () => Promise<T> | T,
    concurrency: number,
    expectedTotalThreshold?: number
  ): Promise<{
    results: T[];
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    memoryUsage: number;
  }> => {
    const markStart = `${operationName}-concurrent-start`;
    const markEnd = `${operationName}-concurrent-end`;

    if (global.gc) global.gc();
    const memoryBefore = process.memoryUsage();

    performance.mark(markStart);
    const startTime = performance.now();

    const promises = Array.from({ length: concurrency }, async (_, index) => {
      const itemStart = performance.now();
      const result = await operation();
      const itemEnd = performance.now();
      
      return {
        result,
        duration: itemEnd - itemStart,
        index,
      };
    });

    const completedOperations = await Promise.all(promises);
    
    const endTime = performance.now();
    performance.mark(markEnd);
    performance.measure(`${operationName}-concurrent`, markStart, markEnd);

    if (global.gc) global.gc();
    const memoryAfter = process.memoryUsage();
    const memoryUsage = memoryAfter.heapUsed - memoryBefore.heapUsed;

    const totalDuration = endTime - startTime;
    const durations = completedOperations.map(op => op.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    if (expectedTotalThreshold && totalDuration > expectedTotalThreshold) {
      console.warn(`Concurrent performance warning: ${operationName} (${concurrency}x) took ${totalDuration.toFixed(2)}ms, expected < ${expectedTotalThreshold}ms`);
    }

    console.log(`Concurrent Performance: ${operationName} (${concurrency}x) - Total: ${totalDuration.toFixed(2)}ms, Avg: ${averageDuration.toFixed(2)}ms, Range: ${minDuration.toFixed(2)}-${maxDuration.toFixed(2)}ms`);

    return {
      results: completedOperations.map(op => op.result),
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      memoryUsage,
    };
  },

  // Memory leak detection
  detectMemoryLeaks: async (
    operationName: string,
    operation: () => Promise<void> | void,
    iterations: number = 100
  ): Promise<{ hasLeak: boolean; memoryGrowth: number; averageGrowthPerIteration: number }> => {
    const measurements: number[] = [];

    // Perform initial garbage collection
    if (global.gc) global.gc();
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < iterations; i++) {
      await operation();
      
      // Perform garbage collection every 10 iterations
      if (i % 10 === 9 && global.gc) {
        global.gc();
      }
      
      measurements.push(process.memoryUsage().heapUsed);
    }

    // Final garbage collection
    if (global.gc) global.gc();
    const finalMemory = process.memoryUsage().heapUsed;

    const memoryGrowth = finalMemory - initialMemory;
    const averageGrowthPerIteration = memoryGrowth / iterations;
    
    // Consider it a leak if memory grows more than threshold per iteration
    const hasLeak = averageGrowthPerIteration > performanceTestUtils.THRESHOLDS.MEMORY_USAGE.LEAK_THRESHOLD / iterations;

    console.log(`Memory Leak Test: ${operationName} (${iterations} iterations)`);
    console.log(`  Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Total growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Average growth per iteration: ${(averageGrowthPerIteration / 1024).toFixed(2)}KB`);
    console.log(`  Leak detected: ${hasLeak ? 'YES' : 'NO'}`);

    return {
      hasLeak,
      memoryGrowth,
      averageGrowthPerIteration,
    };
  },

  // Load testing simulation
  simulateLoad: async <T>(
    operationName: string,
    operation: () => Promise<T> | T,
    loadPattern: {
      initialUsers: number;
      maxUsers: number;
      rampUpTime: number; // milliseconds
      sustainTime: number; // milliseconds
      rampDownTime: number; // milliseconds
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    throughput: number; // requests per second
    errors: Error[];
  }> => {
    const results: { success: boolean; duration: number; error?: Error }[] = [];
    const startTime = performance.now();

    console.log(`Load Test: ${operationName} starting with pattern:`, loadPattern);

    // Ramp up phase
    const rampUpStep = (loadPattern.maxUsers - loadPattern.initialUsers) / (loadPattern.rampUpTime / 100);
    let currentUsers = loadPattern.initialUsers;

    for (let t = 0; t < loadPattern.rampUpTime; t += 100) {
      const activePromises: Promise<void>[] = [];
      
      for (let u = 0; u < Math.floor(currentUsers); u++) {
        activePromises.push(
          (async () => {
            try {
              const operationStart = performance.now();
              await operation();
              const operationEnd = performance.now();
              
              results.push({
                success: true,
                duration: operationEnd - operationStart,
              });
            } catch (error) {
              results.push({
                success: false,
                duration: 0,
                error: error as Error,
              });
            }
          })()
        );
      }
      
      await Promise.all(activePromises);
      currentUsers = Math.min(loadPattern.maxUsers, currentUsers + rampUpStep);
      
      // Wait for next step
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Sustain phase
    const sustainPromises: Promise<void>[] = [];
    const sustainStart = performance.now();
    
    while (performance.now() - sustainStart < loadPattern.sustainTime) {
      for (let u = 0; u < loadPattern.maxUsers; u++) {
        sustainPromises.push(
          (async () => {
            try {
              const operationStart = performance.now();
              await operation();
              const operationEnd = performance.now();
              
              results.push({
                success: true,
                duration: operationEnd - operationStart,
              });
            } catch (error) {
              results.push({
                success: false,
                duration: 0,
                error: error as Error,
              });
            }
          })()
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await Promise.all(sustainPromises);

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Calculate metrics
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.filter(r => !r.success).length;
    const totalRequests = results.length;
    
    const responseTimes = results.filter(r => r.success).map(r => r.duration);
    const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length || 0;
    const maxResponseTime = Math.max(...responseTimes, 0);
    const minResponseTime = Math.min(...responseTimes, 0);
    
    const throughput = totalRequests / (totalDuration / 1000); // requests per second
    const errors = results.filter(r => !r.success).map(r => r.error!);

    console.log(`Load Test Results: ${operationName}`);
    console.log(`  Total requests: ${totalRequests}`);
    console.log(`  Successful: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`  Failed: ${failedRequests} (${((failedRequests / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`  Average response time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`  Response time range: ${minResponseTime.toFixed(2)}-${maxResponseTime.toFixed(2)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      throughput,
      errors,
    };
  },

  // Performance regression testing
  compareWithBaseline: (
    operationName: string,
    currentMetrics: { duration: number; memoryUsage: number },
    baselineMetrics: { duration: number; memoryUsage: number },
    tolerancePercent: number = 10
  ): { passed: boolean; regressions: string[] } => {
    const regressions: string[] = [];

    // Check duration regression
    const durationIncrease = ((currentMetrics.duration - baselineMetrics.duration) / baselineMetrics.duration) * 100;
    if (durationIncrease > tolerancePercent) {
      regressions.push(`Duration increased by ${durationIncrease.toFixed(2)}% (${currentMetrics.duration.toFixed(2)}ms vs ${baselineMetrics.duration.toFixed(2)}ms)`);
    }

    // Check memory usage regression
    const memoryIncrease = ((currentMetrics.memoryUsage - baselineMetrics.memoryUsage) / baselineMetrics.memoryUsage) * 100;
    if (memoryIncrease > tolerancePercent) {
      regressions.push(`Memory usage increased by ${memoryIncrease.toFixed(2)}% (${(currentMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB vs ${(baselineMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB)`);
    }

    const passed = regressions.length === 0;

    console.log(`Performance Regression Check: ${operationName}`);
    console.log(`  Passed: ${passed ? 'YES' : 'NO'}`);
    if (!passed) {
      console.log('  Regressions:', regressions.join(', '));
    }

    return { passed, regressions };
  },

  // CPU profiling utilities
  profileCPU: async <T>(
    operationName: string,
    operation: () => Promise<T> | T,
    samples: number = 100
  ): Promise<{ result: T; cpuProfile: any }> => {
    const profiler = require('v8-profiler-next');
    
    profiler.startProfiling(operationName);
    
    try {
      const result = await operation();
      
      const profile = profiler.stopProfiling(operationName);
      
      console.log(`CPU Profile: ${operationName} completed with ${samples} samples`);
      
      return {
        result,
        cpuProfile: profile,
      };
    } catch (error) {
      profiler.stopProfiling(operationName);
      throw error;
    }
  },

  // Resource monitoring
  monitorResources: () => {
    const initialUsage = process.resourceUsage();
    
    return {
      stop: (): NodeJS.ResourceUsage => {
        const finalUsage = process.resourceUsage();
        
        console.log('Resource Usage:');
        console.log(`  User CPU time: ${(finalUsage.userCPUTime - initialUsage.userCPUTime) / 1000}ms`);
        console.log(`  System CPU time: ${(finalUsage.systemCPUTime - initialUsage.systemCPUTime) / 1000}ms`);
        console.log(`  Max RSS: ${(finalUsage.maxRSS / 1024).toFixed(2)}KB`);
        
        return finalUsage;
      },
    };
  },

  // Get current performance metrics
  getCurrentMetrics: () => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
    };
  },
};

// Add global performance test utilities
global.performanceTestUtils = performanceTestUtils;

// Extended timeout for performance tests
jest.setTimeout(30000);

declare global {
  var performanceTestUtils: typeof performanceTestUtils;
}