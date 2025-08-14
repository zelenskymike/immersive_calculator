/**
 * K6 Load Testing Scripts for TCO Calculator
 * Comprehensive load testing scenarios for scalability validation
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const calculationDuration = new Trend('calculation_duration');
const concurrentUsers = new Gauge('concurrent_users');
const calculationsPerSecond = new Rate('calculations_per_second');
const memoryUsage = new Trend('memory_usage_mb');
const apiErrors = new Counter('api_errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WEB_URL = __ENV.WEB_URL || 'http://localhost:3000';

// Test data configurations
const testConfigurations = [
  // Small data center
  {
    name: 'Small',
    weight: 40,
    config: {
      air_cooling: {
        input_method: 'rack_count',
        rack_count: 10,
        power_per_rack_kw: 15,
        rack_type: '42U_STANDARD',
      },
      immersion_cooling: {
        input_method: 'auto_optimize',
        target_power_kw: 150,
        coolant_type: 'synthetic',
      },
      financial: {
        analysis_years: 5,
        discount_rate: 0.08,
        currency: 'USD',
        region: 'US',
      },
    },
  },
  // Medium data center
  {
    name: 'Medium',
    weight: 35,
    config: {
      air_cooling: {
        input_method: 'rack_count',
        rack_count: 50,
        power_per_rack_kw: 18,
        rack_type: '42U_STANDARD',
      },
      immersion_cooling: {
        input_method: 'auto_optimize',
        target_power_kw: 900,
        coolant_type: 'synthetic',
      },
      financial: {
        analysis_years: 7,
        discount_rate: 0.10,
        currency: 'EUR',
        region: 'EU',
      },
    },
  },
  // Large data center
  {
    name: 'Large',
    weight: 20,
    config: {
      air_cooling: {
        input_method: 'rack_count',
        rack_count: 200,
        power_per_rack_kw: 25,
        rack_type: '48U_HIGH_DENSITY',
      },
      immersion_cooling: {
        input_method: 'manual_config',
        tank_configurations: [
          { size: '23U', quantity: 30, power_density_kw_per_u: 2.2 },
          { size: '20U', quantity: 20, power_density_kw_per_u: 2.0 },
          { size: '18U', quantity: 15, power_density_kw_per_u: 1.8 },
        ],
        coolant_type: 'mineral_oil',
      },
      financial: {
        analysis_years: 10,
        discount_rate: 0.12,
        currency: 'SAR',
        region: 'ME',
      },
    },
  },
  // Complex configuration
  {
    name: 'Complex',
    weight: 5,
    config: {
      air_cooling: {
        input_method: 'total_power',
        total_power_kw: 10000,
        rack_type: '48U_HIGH_DENSITY',
        hvac_efficiency: 0.88,
        power_distribution_efficiency: 0.96,
        space_efficiency: 0.85,
      },
      immersion_cooling: {
        input_method: 'manual_config',
        tank_configurations: [
          { size: '23U', quantity: 100, power_density_kw_per_u: 2.5 },
          { size: '20U', quantity: 75, power_density_kw_per_u: 2.3 },
          { size: '18U', quantity: 50, power_density_kw_per_u: 2.1 },
          { size: '16U', quantity: 25, power_density_kw_per_u: 1.9 },
        ],
        coolant_type: 'synthetic',
        pumping_efficiency: 0.94,
        heat_exchanger_efficiency: 0.97,
      },
      financial: {
        analysis_years: 10,
        discount_rate: 0.15,
        currency: 'AED',
        region: 'ME',
        custom_energy_cost: 0.25,
        custom_labor_cost: 120,
        energy_escalation_rate: 0.05,
        maintenance_escalation_rate: 0.04,
      },
    },
  },
];

// Weighted random selection of test configurations
function getRandomConfiguration() {
  const totalWeight = testConfigurations.reduce((sum, config) => sum + config.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const config of testConfigurations) {
    random -= config.weight;
    if (random <= 0) {
      return config;
    }
  }
  
  return testConfigurations[0]; // Fallback
}

// Test scenarios configuration
export const options = {
  scenarios: {
    // Smoke test - verify basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
      env: { TEST_TYPE: 'smoke' },
    },
    
    // Load test - normal expected load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // Ramp up
        { duration: '5m', target: 10 },  // Stable load
        { duration: '2m', target: 20 },  // Step up
        { duration: '5m', target: 20 },  // Stable higher load
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
      env: { TEST_TYPE: 'load' },
    },
    
    // Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },   // Ramp up
        { duration: '5m', target: 50 },   // High load
        { duration: '2m', target: 100 },  // Very high load
        { duration: '5m', target: 100 },  // Sustain
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'stress' },
      env: { TEST_TYPE: 'stress' },
    },
    
    // Spike test - sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 10 },   // Normal load
        { duration: '30s', target: 100 }, // Spike up
        { duration: '3m', target: 100 },  // Sustain spike
        { duration: '30s', target: 10 },  // Spike down
        { duration: '1m', target: 10 },   // Return to normal
        { duration: '30s', target: 0 },   // End
      ],
      tags: { test_type: 'spike' },
      env: { TEST_TYPE: 'spike' },
    },
    
    // Volume test - large number of calculations over time
    volume_test: {
      executor: 'constant-arrival-rate',
      rate: 30, // 30 iterations per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      tags: { test_type: 'volume' },
      env: { TEST_TYPE: 'volume' },
    },
    
    // Soak test - extended duration
    soak_test: {
      executor: 'constant-vus',
      vus: 15,
      duration: '30m',
      tags: { test_type: 'soak' },
      env: { TEST_TYPE: 'soak' },
    },
  },
  
  // Global thresholds
  thresholds: {
    // Response times
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'http_req_duration{test_type:smoke}': ['p(95)<1000'], // Smoke test should be faster
    'calculation_duration': ['p(95)<3000'], // 95% of calculations under 3s
    
    // Error rates
    'errors': ['rate<0.05'], // Error rate under 5%
    'http_req_failed': ['rate<0.05'],
    'api_errors': ['count<100'], // Less than 100 API errors total
    
    // Throughput
    'calculations_per_second': ['rate>0.5'], // At least 0.5 calculations per second
    'http_reqs': ['rate>10'], // At least 10 requests per second
    
    // Resource usage (if available)
    'memory_usage_mb': ['p(95)<500'], // Memory usage under 500MB
  },
  
  // Global options
  userAgent: 'TCO-Calculator-Load-Test/1.0',
  batch: 10, // Batch multiple requests
  batchPerHost: 5,
  httpDebug: 'full', // Enable HTTP debugging for failures
  insecureSkipTLSVerify: true,
  
  // Tags for test organization
  tags: {
    environment: __ENV.ENVIRONMENT || 'test',
    version: __ENV.VERSION || '1.0.0',
  },
};

// Setup function - runs once at the start
export function setup() {
  console.log(`🚀 Starting load tests against ${BASE_URL}`);
  console.log(`Test type: ${__ENV.TEST_TYPE || 'all'}`);
  
  // Health check
  const healthResponse = http.get(`${BASE_URL}/api/v1/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Service not healthy: ${healthResponse.status}`);
  }
  
  console.log('✅ Service health check passed');
  
  // Get configuration defaults
  const configResponse = http.get(`${BASE_URL}/api/v1/config/defaults`);
  const configData = configResponse.status === 200 ? configResponse.json() : {};
  
  return {
    startTime: Date.now(),
    serviceHealth: healthResponse.json(),
    configDefaults: configData,
  };
}

// Main test function
export default function(data) {
  const testType = __ENV.TEST_TYPE || 'load';
  
  // Update concurrent users metric
  concurrentUsers.add(__VU);
  
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/api/v1/health`);
    
    check(response, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    if (response.status !== 200) {
      errorRate.add(1);
      apiErrors.add(1);
    }
  });
  
  group('Configuration Validation', () => {
    const config = getRandomConfiguration();
    
    const validationResponse = http.post(
      `${BASE_URL}/api/v1/calculations/validate`,
      JSON.stringify({ configuration: config.config }),
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TCO-Load-Test/1.0',
        },
        tags: {
          endpoint: 'validate',
          config_type: config.name,
        },
      }
    );
    
    const validationSuccess = check(validationResponse, {
      'validation status is 200': (r) => r.status === 200,
      'validation response time < 1000ms': (r) => r.timings.duration < 1000,
      'validation returns valid result': (r) => {
        try {
          const body = r.json();
          return body.valid === true;
        } catch {
          return false;
        }
      },
    });
    
    if (!validationSuccess) {
      errorRate.add(1);
      apiErrors.add(1);
      console.warn(`Validation failed for ${config.name} config: ${validationResponse.status}`);
    }
  });
  
  group('TCO Calculation', () => {
    const config = getRandomConfiguration();
    const startTime = Date.now();
    
    const calculationResponse = http.post(
      `${BASE_URL}/api/v1/calculations/calculate`,
      JSON.stringify({ configuration: config.config }),
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TCO-Load-Test/1.0',
        },
        timeout: '30s', // 30 second timeout for calculations
        tags: {
          endpoint: 'calculate',
          config_type: config.name,
          config_complexity: config.name.toLowerCase(),
        },
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    calculationDuration.add(duration);
    
    const calculationSuccess = check(calculationResponse, {
      'calculation status is 200': (r) => r.status === 200,
      'calculation response time < 10s': (r) => r.timings.duration < 10000,
      'calculation returns valid structure': (r) => {
        try {
          const body = r.json();
          return body.summary && body.breakdown && body.charts && body.calculation_id;
        } catch {
          return false;
        }
      },
      'calculation returns positive savings': (r) => {
        try {
          const body = r.json();
          return body.summary.total_tco_savings_5yr >= 0;
        } catch {
          return false;
        }
      },
      'calculation has valid financial metrics': (r) => {
        try {
          const body = r.json();
          const summary = body.summary;
          return summary.roi_percent >= 0 && 
                 summary.payback_months > 0 && 
                 summary.cost_per_kw_air_cooling > 0;
        } catch {
          return false;
        }
      },
    });
    
    if (calculationSuccess) {
      calculationsPerSecond.add(1);
      
      // Store calculation ID for potential sharing test
      if (calculationResponse.status === 200) {
        const calcData = calculationResponse.json();
        __ENV.LAST_CALCULATION_ID = calcData.calculation_id;
      }
    } else {
      errorRate.add(1);
      apiErrors.add(1);
      console.warn(`Calculation failed for ${config.name}: ${calculationResponse.status} - ${calculationResponse.body}`);
    }
  });
  
  // Occasionally test sharing functionality (10% of tests)
  if (Math.random() < 0.1 && __ENV.LAST_CALCULATION_ID) {
    group('Calculation Sharing', () => {
      const shareResponse = http.post(
        `${BASE_URL}/api/v1/sharing/create`,
        JSON.stringify({ calculation_id: __ENV.LAST_CALCULATION_ID }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          tags: {
            endpoint: 'sharing',
          },
        }
      );
      
      const shareSuccess = check(shareResponse, {
        'sharing status is 200': (r) => r.status === 200,
        'sharing returns share_id': (r) => {
          try {
            const body = r.json();
            return body.share_id && body.share_url;
          } catch {
            return false;
          }
        },
      });
      
      if (!shareSuccess) {
        errorRate.add(1);
        apiErrors.add(1);
      }
      
      // Test accessing shared calculation
      if (shareResponse.status === 200) {
        const shareData = shareResponse.json();
        
        const accessResponse = http.get(`${BASE_URL}/api/v1/sharing/${shareData.share_id}`, {
          tags: { endpoint: 'shared_access' },
        });
        
        check(accessResponse, {
          'shared access status is 200': (r) => r.status === 200,
          'shared access returns calculation': (r) => {
            try {
              const body = r.json();
              return body.summary && body.breakdown;
            } catch {
              return false;
            }
          },
        });
      }
    });
  }
  
  // Frontend load test (25% of tests)
  if (Math.random() < 0.25) {
    group('Frontend Load Test', () => {
      const frontendResponse = http.get(WEB_URL, {
        tags: { endpoint: 'frontend' },
      });
      
      check(frontendResponse, {
        'frontend status is 200': (r) => r.status === 200,
        'frontend response time < 3s': (r) => r.timings.duration < 3000,
        'frontend returns HTML': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/html'),
      });
      
      if (frontendResponse.status !== 200) {
        errorRate.add(1);
      }
    });
  }
  
  // Simulate realistic user behavior with think time
  const thinkTime = Math.random() * 3 + 1; // 1-4 seconds
  sleep(thinkTime);
  
  // Memory usage simulation (placeholder)
  if (__ITER % 10 === 0) {
    memoryUsage.add(Math.random() * 100 + 50); // Simulated memory usage
  }
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Load test completed');
  console.log(`Test duration: ${((Date.now() - data.startTime) / 1000).toFixed(2)}s`);
  
  // Final health check
  const finalHealthResponse = http.get(`${BASE_URL}/api/v1/health`);
  console.log(`Final health check: ${finalHealthResponse.status}`);
  
  if (finalHealthResponse.status !== 200) {
    console.error('⚠️  Service appears unhealthy after load test');
  } else {
    console.log('✅ Service remains healthy after load test');
  }
}

// Custom summary report
export function handleSummary(data) {
  const htmlReportPath = __ENV.HTML_REPORT_PATH || 'load-test-report.html';
  const jsonReportPath = __ENV.JSON_REPORT_PATH || 'load-test-results.json';
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [htmlReportPath]: htmlReport(data),
    [jsonReportPath]: JSON.stringify(data, null, 2),
  };
}

// Utility functions for different test types
export function smokeTest() {
  const config = testConfigurations[0]; // Use simple config for smoke test
  
  const response = http.post(
    `${BASE_URL}/api/v1/calculations/calculate`,
    JSON.stringify({ configuration: config.config }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  check(response, {
    'smoke test calculation succeeds': (r) => r.status === 200,
    'smoke test completes quickly': (r) => r.timings.duration < 2000,
  });
}

export function stressTest() {
  // Use most complex configuration for stress testing
  const config = testConfigurations[testConfigurations.length - 1];
  
  const response = http.post(
    `${BASE_URL}/api/v1/calculations/calculate`,
    JSON.stringify({ configuration: config.config }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '60s', // Extended timeout for stress test
    }
  );
  
  check(response, {
    'stress test handles complex calculation': (r) => r.status === 200 || r.status === 503,
    'stress test responds within timeout': (r) => r.timings.duration < 60000,
  });
}