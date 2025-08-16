/**
 * Database configuration and connection management
 */

import { Pool, PoolConfig } from 'pg';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

import { logger } from '@/utils/logger';

// PostgreSQL connection configuration
export const getDatabaseConfig = (): PoolConfig => {
  const config: PoolConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'tco_calculator',
    
    // Connection pool settings
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000'),
    
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    
    // Application name for monitoring
    application_name: 'tco-calculator-api'
  };
  
  return config;
};

// Database connection pool
export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool;
  private isConnected = false;

  private constructor() {
    this.pool = new Pool(getDatabaseConfig());
    this.setupEventHandlers();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      logger.info('New database client connected');
      this.isConnected = true;
    });

    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
      this.isConnected = false;
    });

    this.pool.on('remove', () => {
      logger.debug('Database client removed from pool');
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', {
        text: text.substring(0, 100),
        duration,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query error:', {
        text: text.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<{ status: 'pass' | 'fail'; response_time_ms: number; output?: string }> {
    const start = Date.now();
    
    try {
      await this.query('SELECT 1');
      return {
        status: 'pass',
        response_time_ms: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'fail',
        response_time_ms: Date.now() - start,
        output: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  public getStats(): {
    total_connections: number;
    idle_connections: number;
    waiting_count: number;
  } {
    return {
      total_connections: this.pool.totalCount,
      idle_connections: this.pool.idleCount,
      waiting_count: this.pool.waitingCount
    };
  }

  public isHealthy(): boolean {
    return this.isConnected && this.pool.totalCount > 0;
  }

  public async close(): Promise<void> {
    logger.info('Closing database connection pool...');
    await this.pool.end();
    this.isConnected = false;
  }
}

// Redis configuration and client
export class RedisManager {
  private static instance: RedisManager;
  private client: RedisClientType;
  private isConnected = false;

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = createClient({
      url: redisUrl,
      retryDelay: (retries) => Math.min(retries * 50, 500),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.setupEventHandlers();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    this.client.on('end', () => {
      logger.info('Redis client connection ended');
      this.isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  public async healthCheck(): Promise<{ status: 'pass' | 'fail'; response_time_ms: number; output?: string }> {
    const start = Date.now();
    
    try {
      await this.client.ping();
      return {
        status: 'pass',
        response_time_ms: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'fail',
        response_time_ms: Date.now() - start,
        output: error instanceof Error ? error.message : 'Unknown Redis error'
      };
    }
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }

  public async close(): Promise<void> {
    logger.info('Closing Redis connection...');
    await this.client.quit();
    this.isConnected = false;
  }
}

// Initialize database and Redis connections
export const db = DatabaseManager.getInstance();
export const redis = RedisManager.getInstance();

// Connection initialization
export async function initializeConnections(): Promise<void> {
  try {
    logger.info('Initializing database connections...');
    
    // Test database connection
    const dbHealth = await db.healthCheck();
    if (dbHealth.status === 'fail') {
      throw new Error(`Database connection failed: ${dbHealth.output}`);
    }
    
    // Initialize Redis connection
    await redis.connect();
    const redisHealth = await redis.healthCheck();
    if (redisHealth.status === 'fail') {
      throw new Error(`Redis connection failed: ${redisHealth.output}`);
    }
    
    logger.info('All database connections initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database connections:', error);
    throw error;
  }
}

// Health check for all connections
export async function checkConnectionsHealth(): Promise<{
  database: { status: 'pass' | 'fail'; response_time_ms: number; output?: string };
  redis: { status: 'pass' | 'fail'; response_time_ms: number; output?: string };
}> {
  const [dbHealth, redisHealth] = await Promise.all([
    db.healthCheck(),
    redis.healthCheck()
  ]);

  return {
    database: dbHealth,
    redis: redisHealth
  };
}