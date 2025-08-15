/**
 * Comprehensive API Integration Tests
 * Tests all API endpoints with authentication, validation, error handling, and performance
 */

import request from 'supertest';
import { Express } from 'express';
import { jest } from '@jest/globals';

// Import the Express app (this would need to be adjusted based on actual app structure)
let app: Express;

beforeAll(async () => {
  // Initialize the Express app with test configuration
  // This would typically import from the actual server setup
  const { createApp } = await import('../../packages/backend/src/server');
  app = await createApp({
    database: backendTestUtils.getTestDb(),
    redis: backendTestUtils.getTestRedis(),
    env: 'test',
  });
});

describe('API Integration Tests', () => {
  describe('Health and Status Endpoints', () => {
    describe('GET /api/v1/health', () => {
      it('should return healthy status', async () => {
        const response = await request(app)
          .get('/api/v1/health')
          .expect(200);

        backendTestUtils.validateApiResponse(response.body, {
          status: 'string',
          timestamp: 'string',
          version: 'string',
        });

        expect(response.body.status).toBe('healthy');
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      });

      it('should include database and Redis status', async () => {
        const response = await request(app)
          .get('/api/v1/health?detailed=true')
          .expect(200);

        expect(response.body).toHaveProperty('database');
        expect(response.body).toHaveProperty('redis');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('memory');
      });

      it('should respond quickly', async () => {
        const { duration } = await backendTestUtils.measureExecutionTime(
          'health-check',
          () => request(app).get('/api/v1/health')
        );

        expect(duration).toBeLessThan(performanceTestUtils.THRESHOLDS.API_ENDPOINTS.GET);
      });
    });

    describe('GET /api/v1/config/defaults', () => {
      it('should return configuration defaults', async () => {
        const response = await request(app)
          .get('/api/v1/config/defaults')
          .expect(200);

        backendTestUtils.validateApiResponse(response.body, {
          currencies: 'object',
          regions: 'object',
          energy_costs: 'object',
          equipment_defaults: 'object',
        });

        expect(Array.isArray(response.body.currencies)).toBe(true);
        expect(testConstants.CURRENCIES.every(currency => 
          response.body.currencies.includes(currency)
        )).toBe(true);
      });

      it('should include all required default values', async () => {
        const response = await request(app)
          .get('/api/v1/config/defaults')
          .expect(200);

        const { body } = response;

        // Validate currency list
        expect(body.currencies).toEqual(expect.arrayContaining(['USD', 'EUR', 'SAR', 'AED']));

        // Validate region data
        expect(body.regions).toHaveProperty('US');
        expect(body.regions).toHaveProperty('EU');
        expect(body.regions).toHaveProperty('ME');

        // Validate energy costs are reasonable
        Object.values(body.energy_costs).forEach((cost: any) => {
          expect(typeof cost).toBe('number');
          expect(cost).toBeGreaterThan(0);
          expect(cost).toBeLessThan(1); // Should be less than $1/kWh
        });

        // Validate equipment defaults
        expect(body.equipment_defaults).toHaveProperty('air_cooling');
        expect(body.equipment_defaults).toHaveProperty('immersion_cooling');
      });
    });
  });

  describe('Calculation Endpoints', () => {
    const validCalculationPayload = {
      configuration: {
        air_cooling: {
          input_method: 'rack_count',
          rack_count: 20,
          power_per_rack_kw: 15,
          rack_type: '42U_STANDARD',
        },
        immersion_cooling: {
          input_method: 'auto_optimize',
          target_power_kw: 300,
          coolant_type: 'synthetic',
        },
        financial: {
          analysis_years: 5,
          discount_rate: 0.08,
          currency: 'USD',
          region: 'US',
        },
      },
    };

    describe('POST /api/v1/calculations/validate', () => {
      it('should validate correct configuration', async () => {
        const response = await request(app)
          .post('/api/v1/calculations/validate')
          .send(validCalculationPayload)
          .expect(200);

        backendTestUtils.validateApiResponse(response.body, {
          valid: 'boolean',
          errors: 'object',
          warnings: 'object',
        });

        expect(response.body.valid).toBe(true);
        expect(response.body.errors).toHaveLength(0);
      });

      it('should detect validation errors', async () => {
        const invalidPayload = {
          configuration: {
            air_cooling: {
              input_method: 'rack_count',
              rack_count: 0, // Invalid
              power_per_rack_kw: 15,
            },
            immersion_cooling: {
              input_method: 'auto_optimize',
              target_power_kw: 300,
            },
            financial: {
              analysis_years: 15, // Invalid - too high
              currency: 'USD',
            },
          },
        };

        const response = await request(app)
          .post('/api/v1/calculations/validate')
          .send(invalidPayload)
          .expect(400);

        expect(response.body.valid).toBe(false);
        expect(response.body.errors.length).toBeGreaterThan(0);
        
        const errorMessages = response.body.errors.join(' ');
        expect(errorMessages).toContain('rack count');
        expect(errorMessages).toContain('analysis years');
      });

      it('should handle malformed requests', async () => {
        const malformedPayloads = [
          {}, // Empty payload
          { configuration: null }, // Null configuration
          { configuration: {} }, // Missing required sections
          { invalid: 'payload' }, // Wrong structure
        ];

        for (const payload of malformedPayloads) {
          const response = await request(app)
            .post('/api/v1/calculations/validate')
            .send(payload)
            .expect(400);

          expect(response.body).toHaveProperty('error');
          expect(response.body.valid).toBe(false);
        }
      });

      it('should provide helpful validation warnings', async () => {
        const suboptimalPayload = {
          configuration: {
            ...validCalculationPayload.configuration,
            air_cooling: {
              ...validCalculationPayload.configuration.air_cooling,
              hvac_efficiency: 0.6, // Low efficiency - should warn
            },
            financial: {
              ...validCalculationPayload.configuration.financial,
              discount_rate: 0.25, // Very high discount rate - should warn
            },
          },
        };

        const response = await request(app)
          .post('/api/v1/calculations/validate')
          .send(suboptimalPayload)
          .expect(200);

        expect(response.body.valid).toBe(true);
        expect(response.body.warnings.length).toBeGreaterThan(0);
        
        const warningMessages = response.body.warnings.join(' ');
        expect(warningMessages).toMatch(/(efficiency|discount|rate)/i);
      });
    });

    describe('POST /api/v1/calculations/calculate', () => {
      it('should perform calculation successfully', async () => {
        const { result: response, duration } = await backendTestUtils.measureExecutionTime(
          'calculation-request',
          () => request(app)
            .post('/api/v1/calculations/calculate')
            .send(validCalculationPayload)
            .expect(200)
        );

        expect(duration).toBeLessThan(performanceTestUtils.THRESHOLDS.API_ENDPOINTS.CALCULATION);

        backendTestUtils.validateApiResponse(response.body, {
          calculation_id: 'string',
          configuration_hash: 'string',
          summary: 'object',
          breakdown: 'object',
          environmental: 'object',
          charts: 'object',
        });

        expect(response.body).toHaveValidTCOStructure();
        expect(response.body.summary.total_tco_savings_5yr).toBePositiveFinancialValue();
      });

      it('should handle different calculation complexity levels', async () => {
        const complexityTests = [
          {
            name: 'Simple',
            payload: {
              configuration: {
                air_cooling: { input_method: 'rack_count', rack_count: 1, power_per_rack_kw: 10 },
                immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 10 },
                financial: { analysis_years: 1, currency: 'USD' },
              },
            },
            expectedThreshold: 200,
          },
          {
            name: 'Complex',
            payload: {
              configuration: {
                air_cooling: { input_method: 'rack_count', rack_count: 500, power_per_rack_kw: 25 },
                immersion_cooling: {
                  input_method: 'manual_config',
                  tank_configurations: [
                    { size: '23U', quantity: 50, power_density_kw_per_u: 2.5 },
                    { size: '20U', quantity: 30, power_density_kw_per_u: 2.0 },
                  ],
                },
                financial: { analysis_years: 10, currency: 'USD' },
              },
            },
            expectedThreshold: 1500,
          },
        ];

        for (const test of complexityTests) {
          const { result: response, duration } = await backendTestUtils.measureExecutionTime(
            `calculation-${test.name.toLowerCase()}`,
            () => request(app)
              .post('/api/v1/calculations/calculate')
              .send(test.payload)
              .expect(200)
          );

          expect(duration).toBeLessThan(test.expectedThreshold);
          expect(response.body).toHaveValidTCOStructure();
        }
      });

      it('should cache calculation results', async () => {
        const cacheKey = 'test-cache-key';
        
        // First request
        const response1 = await request(app)
          .post('/api/v1/calculations/calculate')
          .send(validCalculationPayload)
          .expect(200);

        // Second identical request should be faster (cached)
        const { result: response2, duration: cachedDuration } = await backendTestUtils.measureExecutionTime(
          'cached-calculation',
          () => request(app)
            .post('/api/v1/calculations/calculate')
            .send(validCalculationPayload)
            .expect(200)
        );

        // Results should be identical
        expect(response2.body.configuration_hash).toBe(response1.body.configuration_hash);
        expect(response2.body.summary.total_tco_savings_5yr)
          .toBe(response1.body.summary.total_tco_savings_5yr);

        // Cached request should be significantly faster
        expect(cachedDuration).toBeLessThan(200);
      });

      it('should handle concurrent calculation requests', async () => {
        const concurrentRequests = 10;
        
        const { 
          results, 
          totalDuration, 
          averageDuration 
        } = await performanceTestUtils.measureConcurrentPerformance(
          'concurrent-calculations',
          () => request(app)
            .post('/api/v1/calculations/calculate')
            .send(validCalculationPayload),
          concurrentRequests,
          5000 // 5 second total threshold
        );

        // All requests should succeed
        results.forEach((response: any) => {
          expect(response.status).toBe(200);
          expect(response.body).toHaveValidTCOStructure();
        });

        expect(averageDuration).toBeLessThan(1000);
      });

      it('should return appropriate errors for invalid calculations', async () => {
        const invalidPayload = {
          configuration: {
            air_cooling: {
              input_method: 'rack_count',
              rack_count: -5, // Invalid
            },
            immersion_cooling: {
              input_method: 'auto_optimize',
              target_power_kw: -100, // Invalid
            },
            financial: {
              analysis_years: 0, // Invalid
              currency: 'INVALID',
            },
          },
        };

        const response = await request(app)
          .post('/api/v1/calculations/calculate')
          .send(invalidPayload)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('validation_errors');
        expect(Array.isArray(response.body.validation_errors)).toBe(true);
      });
    });

    describe('GET /api/v1/calculations/:id', () => {
      let calculationId: string;

      beforeEach(async () => {
        // Create a calculation to retrieve
        const response = await request(app)
          .post('/api/v1/calculations/calculate')
          .send(validCalculationPayload)
          .expect(200);
        
        calculationId = response.body.calculation_id;
      });

      it('should retrieve existing calculation', async () => {
        const response = await request(app)
          .get(`/api/v1/calculations/${calculationId}`)
          .expect(200);

        expect(response.body.calculation_id).toBe(calculationId);
        expect(response.body).toHaveValidTCOStructure();
      });

      it('should return 404 for non-existent calculation', async () => {
        const nonExistentId = 'non-existent-id';
        
        const response = await request(app)
          .get(`/api/v1/calculations/${nonExistentId}`)
          .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('not found');
      });

      it('should handle malformed calculation IDs', async () => {
        const malformedIds = ['', '   ', 'invalid-id-format', '123'];

        for (const id of malformedIds) {
          await request(app)
            .get(`/api/v1/calculations/${encodeURIComponent(id)}`)
            .expect(400);
        }
      });
    });
  });

  describe('Sharing Endpoints', () => {
    let calculationId: string;
    let shareId: string;

    beforeEach(async () => {
      // Create a calculation to share
      const calculation = await backendTestUtils.createTestCalculation();
      calculationId = calculation.id;
    });

    describe('POST /api/v1/sharing/create', () => {
      it('should create shareable link', async () => {
        const response = await request(app)
          .post('/api/v1/sharing/create')
          .send({ calculation_id: calculationId })
          .expect(200);

        backendTestUtils.validateApiResponse(response.body, {
          share_id: 'string',
          share_url: 'string',
          expires_at: 'string',
        });

        expect(response.body.share_url).toMatch(/\/shared\//);
        expect(new Date(response.body.expires_at)).toBeInstanceOf(Date);
        
        shareId = response.body.share_id;
      });

      it('should handle custom expiration settings', async () => {
        const customExpiration = new Date();
        customExpiration.setDate(customExpiration.getDate() + 7); // 7 days

        const response = await request(app)
          .post('/api/v1/sharing/create')
          .send({ 
            calculation_id: calculationId,
            expires_at: customExpiration.toISOString(),
          })
          .expect(200);

        const responseExpiration = new Date(response.body.expires_at);
        expect(responseExpiration.getDate()).toBe(customExpiration.getDate());
      });

      it('should reject invalid calculation IDs', async () => {
        const response = await request(app)
          .post('/api/v1/sharing/create')
          .send({ calculation_id: 'non-existent-id' })
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/sharing/:shareId', () => {
      beforeEach(async () => {
        const shared = await backendTestUtils.createTestSharedCalculation(calculationId);
        shareId = shared.share_id;
      });

      it('should retrieve shared calculation', async () => {
        const response = await request(app)
          .get(`/api/v1/sharing/${shareId}`)
          .expect(200);

        expect(response.body).toHaveValidTCOStructure();
        expect(response.body.calculation_id).toBe(calculationId);
      });

      it('should increment access count', async () => {
        // First access
        await request(app)
          .get(`/api/v1/sharing/${shareId}`)
          .expect(200);

        // Second access
        const response = await request(app)
          .get(`/api/v1/sharing/${shareId}`)
          .expect(200);

        // Access count should be tracked (implementation dependent)
        // This would require checking the database or response headers
      });

      it('should return 404 for expired shares', async () => {
        // Create an expired share
        const expiredShare = await backendTestUtils.createTestSharedCalculation(calculationId, {
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        });

        const response = await request(app)
          .get(`/api/v1/sharing/${expiredShare.share_id}`)
          .expect(410); // Gone

        expect(response.body.error).toContain('expired');
      });

      it('should return 404 for non-existent shares', async () => {
        const response = await request(app)
          .get('/api/v1/sharing/non-existent-share')
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Error Handling and Security', () => {
    describe('Rate Limiting', () => {
      it('should enforce rate limits on calculation endpoints', async () => {
        const requests = [];
        const maxRequests = 20; // Assuming rate limit of ~15-20 per minute

        for (let i = 0; i < maxRequests; i++) {
          requests.push(
            request(app)
              .post('/api/v1/calculations/calculate')
              .send(validCalculationPayload)
          );
        }

        const responses = await Promise.all(requests);
        
        // Some requests should be rate limited
        const rateLimited = responses.filter(response => response.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);

        // Rate limited responses should have appropriate headers
        rateLimited.forEach(response => {
          expect(response.headers).toHaveProperty('retry-after');
          expect(response.body.error).toMatch(/rate limit/i);
        });
      });

      it('should have different rate limits for different endpoints', async () => {
        const healthRequests = Array.from({ length: 50 }, () =>
          request(app).get('/api/v1/health')
        );

        const calculationRequests = Array.from({ length: 25 }, () =>
          request(app)
            .post('/api/v1/calculations/calculate')
            .send(validCalculationPayload)
        );

        const [healthResponses, calcResponses] = await Promise.all([
          Promise.all(healthRequests),
          Promise.all(calculationRequests),
        ]);

        // Health endpoint should be more lenient
        const healthRateLimited = healthResponses.filter(r => r.status === 429);
        const calcRateLimited = calcResponses.filter(r => r.status === 429);

        expect(calcRateLimited.length).toBeGreaterThan(healthRateLimited.length);
      });
    });

    describe('Input Validation and Sanitization', () => {
      it('should sanitize malicious input', async () => {
        const maliciousPayload = {
          configuration: {
            air_cooling: {
              input_method: 'rack_count',
              rack_count: "<script>alert('xss')</script>", // XSS attempt
              power_per_rack_kw: 15,
            },
            immersion_cooling: {
              input_method: 'auto_optimize',
              target_power_kw: 300,
            },
            financial: {
              analysis_years: 5,
              currency: "USD'; DROP TABLE calculations; --", // SQL injection attempt
            },
          },
        };

        const response = await request(app)
          .post('/api/v1/calculations/calculate')
          .send(maliciousPayload)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/validation|invalid/i);
      });

      it('should reject oversized payloads', async () => {
        const oversizedPayload = {
          configuration: {
            air_cooling: {
              input_method: 'rack_count',
              rack_count: 10,
              power_per_rack_kw: 15,
              // Add a large string to exceed payload limits
              large_field: 'x'.repeat(10 * 1024 * 1024), // 10MB string
            },
            immersion_cooling: {
              input_method: 'auto_optimize',
              target_power_kw: 150,
            },
            financial: {
              analysis_years: 5,
              currency: 'USD',
            },
          },
        };

        const response = await request(app)
          .post('/api/v1/calculations/calculate')
          .send(oversizedPayload);

        expect([413, 400]).toContain(response.status); // Payload too large or bad request
      });
    });

    describe('Error Response Format', () => {
      it('should return consistent error format', async () => {
        const errorEndpoints = [
          { method: 'get', path: '/api/v1/calculations/non-existent', expectedStatus: 404 },
          { method: 'post', path: '/api/v1/calculations/calculate', payload: {}, expectedStatus: 400 },
          { method: 'get', path: '/api/v1/sharing/non-existent', expectedStatus: 404 },
        ];

        for (const endpoint of errorEndpoints) {
          const requestBuilder = request(app)[endpoint.method](endpoint.path);
          
          if (endpoint.payload) {
            requestBuilder.send(endpoint.payload);
          }

          const response = await requestBuilder.expect(endpoint.expectedStatus);

          // All error responses should have consistent structure
          expect(response.body).toHaveProperty('error');
          expect(response.body).toHaveProperty('status');
          expect(response.body.status).toBe(endpoint.expectedStatus);
          
          if (response.body.timestamp) {
            expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
          }
        }
      });
    });
  });

  describe('Performance and Monitoring', () => {
    describe('Response Time Requirements', () => {
      it('should meet SLA response time requirements', async () => {
        const slaTests = [
          { endpoint: 'GET /api/v1/health', threshold: 100, test: () => request(app).get('/api/v1/health') },
          { endpoint: 'GET /api/v1/config/defaults', threshold: 200, test: () => request(app).get('/api/v1/config/defaults') },
          { endpoint: 'POST /api/v1/calculations/validate', threshold: 300, test: () => request(app).post('/api/v1/calculations/validate').send(validCalculationPayload) },
          { endpoint: 'POST /api/v1/calculations/calculate', threshold: 1000, test: () => request(app).post('/api/v1/calculations/calculate').send(validCalculationPayload) },
        ];

        for (const slaTest of slaTests) {
          const { result: response, duration } = await backendTestUtils.measureExecutionTime(
            slaTest.endpoint,
            () => slaTest.test().expect(200)
          );

          expect(duration).toBeLessThan(slaTest.threshold);
          console.log(`SLA: ${slaTest.endpoint} completed in ${duration.toFixed(2)}ms (threshold: ${slaTest.threshold}ms)`);
        }
      });
    });

    describe('Memory Usage', () => {
      it('should not have memory leaks under load', async () => {
        const iterations = 50;
        
        const memoryTest = async () => {
          await request(app)
            .post('/api/v1/calculations/calculate')
            .send(validCalculationPayload)
            .expect(200);
        };

        const { hasLeak, memoryGrowth } = await performanceTestUtils.detectMemoryLeaks(
          'api-memory-test',
          memoryTest,
          iterations
        );

        expect(hasLeak).toBe(false);
        expect(memoryGrowth).toBeLessThan(performanceTestUtils.THRESHOLDS.MEMORY_USAGE.TOTAL_GROWTH);
      });
    });
  });
});