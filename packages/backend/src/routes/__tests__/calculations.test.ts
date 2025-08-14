/**
 * Integration tests for calculation API routes
 * Tests all endpoints with security, validation, and performance requirements
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

import calculationRoutes from '../calculations';
import { securityHeaders, apiRateLimit, validateRequest, sanitizeInput } from '../../middleware/security';
import { errorHandler } from '../../middleware/error';
import type { CalculationConfiguration } from '@tco-calculator/shared';

// Mock Redis for rate limiting
jest.mock('../../config/database', () => ({
  redis: {
    getClient: () => ({
      incr: jest.fn().mockResolvedValue(1),
      decr: jest.fn().mockResolvedValue(0),
      del: jest.fn().mockResolvedValue(1),
      pExpire: jest.fn().mockResolvedValue(1),
    }),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  logCalculation: jest.fn(),
}));

describe('Calculation Routes Integration Tests', () => {
  let app: express.Application;
  let validConfiguration: CalculationConfiguration;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(securityHeaders);
    app.use(sanitizeInput);
    app.use('/api/v1', calculationRoutes);
    app.use(errorHandler);

    validConfiguration = {
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
  });

  describe('POST /api/v1/calculations/validate', () => {
    it('should validate correct configuration', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/validate')
        .send({
          configuration: validConfiguration,
          locale: 'en',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.estimated_processing_time).toBeDefined();
      expect(Array.isArray(response.body.data.warnings)).toBe(true);
    });

    it('should return validation errors for invalid configuration', async () => {
      const invalidConfig = {
        ...validConfiguration,
        air_cooling: {
          input_method: 'rack_count',
          // Missing required fields
        },
      };

      const response = await request(app)
        .post('/api/v1/calculations/validate')
        .send({
          configuration: invalidConfig,
          locale: 'en',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CONFIGURATION');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return warnings for high rack count', async () => {
      const highRackConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          rack_count: 600, // Above warning threshold
        },
      };

      const response = await request(app)
        .post('/api/v1/calculations/validate')
        .send({
          configuration: highRackConfig,
          locale: 'en',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warnings.length).toBeGreaterThan(0);
      expect(response.body.data.warnings[0].field).toBe('air_cooling.rack_count');
    });

    it('should include request ID in response metadata', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/validate')
        .send({
          configuration: validConfiguration,
          locale: 'en',
        })
        .expect(200);

      expect(response.body.meta.request_id).toBeDefined();
      expect(response.body.meta.timestamp).toBeDefined();
    });

    it('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/validate')
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce content type validation', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/validate')
        .set('Content-Type', 'text/plain')
        .send('some text')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/calculations/calculate', () => {
    it('should perform complete TCO calculation', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: validConfiguration,
          locale: 'en',
          save_session: false,
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.breakdown).toBeDefined();
      expect(response.body.data.environmental).toBeDefined();
      expect(response.body.data.charts).toBeDefined();
      
      // Performance requirements
      expect(response.body.meta.processing_time_ms).toBeLessThan(1000);
      expect(responseTime).toBeLessThan(2000);
      
      // Data integrity
      expect(response.body.data.calculation_id).toBeDefined();
      expect(response.body.data.configuration_hash).toBeDefined();
      expect(response.body.data.calculated_at).toBeDefined();
      
      // Financial metrics
      expect(response.body.data.summary.total_tco_savings_5yr).toBeGreaterThan(0);
      expect(response.body.data.summary.roi_percent).toBeGreaterThan(0);
      expect(response.body.data.summary.payback_months).toBeGreaterThan(0);
      expect(response.body.data.summary.npv_savings).toBeGreaterThan(0);
    });

    it('should handle different currencies correctly', async () => {
      const eurConfig = {
        ...validConfiguration,
        financial: {
          ...validConfiguration.financial,
          currency: 'EUR' as const,
          region: 'EU' as const,
        },
      };

      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: eurConfig,
          locale: 'en',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.currency).toBe('EUR');
      expect(response.body.data.summary).toBeDefined();
    });

    it('should handle Arabic locale', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: validConfiguration,
          locale: 'ar',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.locale).toBe('ar');
    });

    it('should calculate different configurations consistently', async () => {
      const manualImmersionConfig = {
        ...validConfiguration,
        immersion_cooling: {
          input_method: 'manual_config' as const,
          tank_configurations: [
            { size: '23U', quantity: 3, power_density_kw_per_u: 2.0 },
            { size: '20U', quantity: 2, power_density_kw_per_u: 2.0 },
          ],
          coolant_type: 'synthetic' as const,
          pumping_efficiency: 0.92,
          heat_exchanger_efficiency: 0.95,
        },
      };

      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: manualImmersionConfig,
          locale: 'en',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total_tco_savings_5yr).toBeGreaterThan(0);
    });

    it('should handle edge case configurations', async () => {
      const edgeConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          rack_count: 1,
          power_per_rack_kw: 0.5,
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          target_power_kw: 0.5,
        },
        financial: {
          ...validConfiguration.financial,
          analysis_years: 1,
        },
      };

      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: edgeConfig,
          locale: 'en',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.breakdown.opex_annual).toHaveLength(1);
    });

    it('should reject invalid configurations', async () => {
      const invalidConfig = {
        ...validConfiguration,
        financial: {
          ...validConfiguration.financial,
          analysis_years: 15, // Too high
        },
      };

      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: invalidConfig,
          locale: 'en',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CONFIGURATION');
    });

    it('should sanitize XSS attempts in input', async () => {
      const xssConfig = {
        ...validConfiguration,
        // Add a field that might contain XSS
        additional_notes: '<script>alert("xss")</script>',
      };

      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: xssConfig,
          locale: 'en',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // XSS should be sanitized
      if (response.body.data.configuration.additional_notes) {
        expect(response.body.data.configuration.additional_notes).not.toContain('<script>');
      }
    });

    it('should handle concurrent requests correctly', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v1/calculations/calculate')
          .send({
            configuration: validConfiguration,
            locale: 'en',
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.calculation_id).toBeDefined();
      });

      // All calculation IDs should be unique
      const calculationIds = responses.map(r => r.body.data.calculation_id);
      const uniqueIds = new Set(calculationIds);
      expect(uniqueIds.size).toBe(calculationIds.length);
    });
  });

  describe('GET /api/v1/calculations/:sessionId', () => {
    it('should return 404 for non-existent session', async () => {
      const fakeUuid = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/v1/calculations/${fakeUuid}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/calculations/invalid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Security and Rate Limiting', () => {
    it('should include security headers in response', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/validate')
        .send({
          configuration: validConfiguration,
          locale: 'en',
        })
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should add request ID header', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/validate')
        .send({
          configuration: validConfiguration,
          locale: 'en',
        })
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });

    // Note: Rate limiting tests would need special setup for isolated testing
    // In production, these would be tested separately with Redis integration
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Test with extremely large configuration that might cause processing errors
      const extremeConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          rack_count: 10000, // Extreme value
        },
      };

      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: extremeConfig,
          locale: 'en',
        });

      // Should either succeed or fail gracefully with proper error structure
      if (response.status !== 200) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBeDefined();
        expect(response.body.error.message).toBeDefined();
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          // Missing configuration
          locale: 'en',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unsupported HTTP methods', async () => {
      await request(app)
        .put('/api/v1/calculations/validate')
        .expect(404);

      await request(app)
        .delete('/api/v1/calculations/validate')
        .expect(404);
    });
  });

  describe('Data Validation and Integrity', () => {
    it('should ensure calculation results are deterministic', async () => {
      const requests = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/v1/calculations/calculate')
          .send({
            configuration: validConfiguration,
            locale: 'en',
          })
      );

      const responses = await Promise.all(requests);

      // All calculations should have same configuration hash
      const configHashes = responses.map(r => r.body.data.configuration_hash);
      expect(configHashes[0]).toBe(configHashes[1]);
      expect(configHashes[1]).toBe(configHashes[2]);

      // Financial results should be identical for same configuration
      const savings = responses.map(r => r.body.data.summary.total_tco_savings_5yr);
      expect(savings[0]).toBe(savings[1]);
      expect(savings[1]).toBe(savings[2]);
    });

    it('should validate PUE calculations are physically realistic', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: validConfiguration,
          locale: 'en',
        })
        .expect(200);

      const pue = response.body.data.pue_analysis;
      
      // PUE should be at least 1.0 (cannot be less than 100% efficiency)
      expect(pue.air_cooling).toBeGreaterThanOrEqual(1.0);
      expect(pue.immersion_cooling).toBeGreaterThanOrEqual(1.0);
      
      // Immersion cooling should be more efficient than air cooling
      expect(pue.immersion_cooling).toBeLessThan(pue.air_cooling);
      
      // PUE values should be realistic (not extreme)
      expect(pue.air_cooling).toBeLessThan(3.0);
      expect(pue.immersion_cooling).toBeLessThan(1.2);
    });

    it('should ensure financial calculations follow expected patterns', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: validConfiguration,
          locale: 'en',
        })
        .expect(200);

      const summary = response.body.data.summary;
      const breakdown = response.body.data.breakdown;
      
      // TCO savings should be positive (immersion cooling is beneficial)
      expect(summary.total_tco_savings_5yr).toBeGreaterThan(0);
      
      // NPV should be less than undiscounted total (time value of money)
      expect(summary.npv_savings).toBeLessThan(summary.total_opex_savings_5yr);
      
      // CAPEX + OPEX should equal TCO
      const totalTCOSavings = summary.total_capex_savings + summary.total_opex_savings_5yr;
      expect(summary.total_tco_savings_5yr).toBeCloseTo(totalTCOSavings, 2);
      
      // Annual OPEX should escalate over time
      for (let i = 1; i < breakdown.opex_annual.length; i++) {
        expect(breakdown.opex_annual[i].air_cooling.energy)
          .toBeGreaterThan(breakdown.opex_annual[i - 1].air_cooling.energy!);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should meet response time requirements', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: validConfiguration,
          locale: 'en',
        })
        .expect(200);

      const totalResponseTime = Date.now() - startTime;
      const processingTime = response.body.meta.processing_time_ms;
      
      // API response time should be under 2 seconds
      expect(totalResponseTime).toBeLessThan(2000);
      
      // Calculation processing should be under 1 second
      expect(processingTime).toBeLessThan(1000);
    });

    it('should handle stress testing', async () => {
      const stressConfig = {
        ...validConfiguration,
        air_cooling: {
          ...validConfiguration.air_cooling,
          rack_count: 500, // Large configuration
        },
        immersion_cooling: {
          ...validConfiguration.immersion_cooling,
          target_power_kw: 7500,
        },
        financial: {
          ...validConfiguration.financial,
          analysis_years: 10, // Maximum years
        },
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: stressConfig,
          locale: 'en',
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      // Even complex calculations should complete within reasonable time
      expect(responseTime).toBeLessThan(5000);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });
  });
});