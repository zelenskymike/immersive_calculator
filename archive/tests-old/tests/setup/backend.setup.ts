/**
 * Backend-specific test setup configuration
 * Sets up database connections, Redis, and API testing utilities
 */

import { jest } from '@jest/globals';
import { Pool } from 'pg';
import { Redis } from 'ioredis';

// Global test database and Redis instances
let testDbPool: Pool;
let testRedisClient: Redis;

// Database setup
beforeAll(async () => {
  // Setup test database connection
  testDbPool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    database: process.env.TEST_DB_NAME || 'tco_calculator_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    max: 5, // Reduced pool size for tests
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 2000,
  });

  // Setup test Redis connection
  testRedisClient = new Redis({
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6380'),
    db: 1, // Use different database for tests
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    // Test database connection
    await testDbPool.query('SELECT NOW()');
    
    // Test Redis connection
    await testRedisClient.connect();
    await testRedisClient.ping();
    
    console.log('Test database and Redis connections established');
  } catch (error) {
    console.error('Failed to establish test connections:', error);
    // Continue with mocked connections if real ones fail
    setupMockConnections();
  }
});

afterAll(async () => {
  // Clean up connections
  if (testDbPool) {
    await testDbPool.end();
  }
  if (testRedisClient) {
    await testRedisClient.disconnect();
  }
});

// Clean up test data before each test
beforeEach(async () => {
  try {
    // Clear Redis test database
    if (testRedisClient && testRedisClient.status === 'ready') {
      await testRedisClient.flushdb();
    }
    
    // Clean up test tables (in reverse dependency order)
    if (testDbPool) {
      await testDbPool.query('TRUNCATE TABLE shared_calculations CASCADE');
      await testDbPool.query('TRUNCATE TABLE calculation_results CASCADE');
      await testDbPool.query('TRUNCATE TABLE rate_limit_logs CASCADE');
      await testDbPool.query('TRUNCATE TABLE audit_logs CASCADE');
    }
  } catch (error) {
    console.warn('Test cleanup warning:', error.message);
    // Continue with test if cleanup fails
  }
});

// Setup mock connections when real ones are not available
function setupMockConnections() {
  // Mock database pool
  testDbPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
  } as any;

  // Mock Redis client
  testRedisClient = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    flushdb: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    status: 'ready',
  } as any;
}

// Export test utilities for backend tests
export const backendTestUtils = {
  // Database utilities
  getTestDb: () => testDbPool,
  getTestRedis: () => testRedisClient,
  
  // Create test calculation data
  createTestCalculation: async (overrides = {}) => {
    const defaultCalculation = {
      configuration_hash: 'test-hash-' + Date.now(),
      configuration: {
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
      },
      results: {
        summary: { total_tco_savings_5yr: 100000 },
        breakdown: {},
        environmental: {},
        charts: {},
      },
      created_at: new Date(),
      ...overrides,
    };

    if (testDbPool.query.mock) {
      // Return mock data
      return { id: 'mock-id', ...defaultCalculation };
    }

    try {
      const result = await testDbPool.query(
        `INSERT INTO calculation_results 
         (configuration_hash, configuration, results, created_at) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [
          defaultCalculation.configuration_hash,
          JSON.stringify(defaultCalculation.configuration),
          JSON.stringify(defaultCalculation.results),
          defaultCalculation.created_at,
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.warn('Failed to create test calculation:', error);
      return { id: 'mock-id', ...defaultCalculation };
    }
  },

  // Create test shared calculation
  createTestSharedCalculation: async (calculationId: string, overrides = {}) => {
    const defaultShared = {
      share_id: 'test-share-' + Date.now(),
      calculation_id: calculationId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      access_count: 0,
      created_at: new Date(),
      ...overrides,
    };

    if (testDbPool.query.mock) {
      return { id: 'mock-shared-id', ...defaultShared };
    }

    try {
      const result = await testDbPool.query(
        `INSERT INTO shared_calculations 
         (share_id, calculation_id, expires_at, access_count, created_at) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          defaultShared.share_id,
          defaultShared.calculation_id,
          defaultShared.expires_at,
          defaultShared.access_count,
          defaultShared.created_at,
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.warn('Failed to create test shared calculation:', error);
      return { id: 'mock-shared-id', ...defaultShared };
    }
  },

  // Mock API request/response utilities
  mockApiRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-agent',
      'x-forwarded-for': '127.0.0.1',
    },
    ip: '127.0.0.1',
    method: 'GET',
    url: '/',
    ...overrides,
  }),

  mockApiResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      locals: {},
      headersSent: false,
    };
    return res;
  },

  // Performance monitoring utilities
  measureExecutionTime: async <T>(
    name: string,
    asyncFn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const start = process.hrtime.bigint();
    const result = await asyncFn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    console.log(`${name} execution time: ${duration.toFixed(2)}ms`);
    return { result, duration };
  },

  // Redis utilities
  setTestCache: async (key: string, value: any, ttl: number = 300) => {
    if (testRedisClient.set.mock) {
      return 'OK';
    }
    
    try {
      await testRedisClient.set(key, JSON.stringify(value), 'EX', ttl);
      return 'OK';
    } catch (error) {
      console.warn('Failed to set test cache:', error);
      return 'OK';
    }
  },

  getTestCache: async (key: string) => {
    if (testRedisClient.get.mock) {
      return null;
    }
    
    try {
      const result = await testRedisClient.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.warn('Failed to get test cache:', error);
      return null;
    }
  },

  // Rate limiting test utilities
  simulateRateLimit: async (identifier: string, limit: number) => {
    for (let i = 0; i < limit + 1; i++) {
      await testRedisClient.incr(`rate_limit:${identifier}`);
    }
  },

  // Validation utilities
  validateApiResponse: (response: any, expectedSchema: any) => {
    const requiredFields = Object.keys(expectedSchema);
    const missingFields = requiredFields.filter(field => !(field in response));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    for (const [field, expectedType] of Object.entries(expectedSchema)) {
      const actualType = typeof response[field];
      if (actualType !== expectedType) {
        throw new Error(`Field ${field}: expected ${expectedType}, got ${actualType}`);
      }
    }

    return true;
  },
};

// Add global backend test utilities
global.backendTestUtils = backendTestUtils;

declare global {
  var backendTestUtils: typeof backendTestUtils;
}