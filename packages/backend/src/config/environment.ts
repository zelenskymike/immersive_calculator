/**
 * Environment configuration and validation
 */

import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables from .env file
dotenv.config();

// Environment variable schema validation
const envSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  
  // Server configuration
  PORT: Joi.number().integer().min(1).max(65535).default(3001),
  HOST: Joi.string().default('localhost'),
  
  // Security
  JWT_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().min(32).required(),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  
  // Database configuration
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().integer().min(1).max(65535).default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_POOL_MIN: Joi.number().integer().min(0).default(5),
  DB_POOL_MAX: Joi.number().integer().min(1).default(20),
  DB_IDLE_TIMEOUT: Joi.number().integer().min(1000).default(30000),
  DB_CONNECT_TIMEOUT: Joi.number().integer().min(1000).default(5000),
  
  // Redis configuration
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_PREFIX: Joi.string().default('tco:'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().min(1).default(100),
  RATE_LIMIT_ADMIN_MAX: Joi.number().integer().min(1).default(1000),
  
  // Session configuration
  SESSION_TIMEOUT_HOURS: Joi.number().min(1).max(720).default(24), // 1-30 days
  SHARE_LINK_DEFAULT_TTL_DAYS: Joi.number().min(1).max(365).default(30),
  
  // File storage
  STORAGE_PROVIDER: Joi.string().valid('local', 's3', 'gcs', 'azure').default('local'),
  STORAGE_BASE_PATH: Joi.string().default('./uploads'),
  MAX_FILE_SIZE_MB: Joi.number().min(1).max(100).default(10),
  
  // AWS S3 (if using S3)
  AWS_ACCESS_KEY_ID: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required()
  }),
  AWS_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required()
  }),
  AWS_REGION: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required()
  }),
  AWS_S3_BUCKET: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required()
  }),
  
  // Email configuration (optional)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().integer().min(1).max(65535).default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM_ADDRESS: Joi.string().email().optional(),
  
  // External services (optional)
  CURRENCY_API_KEY: Joi.string().optional(),
  CURRENCY_API_URL: Joi.string().uri().optional(),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple', 'combined').default('json'),
  
  // Monitoring and metrics
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PREFIX: Joi.string().default('tco_calculator'),
  
  // Admin configuration
  ADMIN_PASSWORD_MIN_LENGTH: Joi.number().integer().min(8).default(12),
  ADMIN_SESSION_TIMEOUT_HOURS: Joi.number().min(1).max(24).default(8),
  
  // Calculation settings
  MAX_CALCULATION_YEARS: Joi.number().integer().min(1).max(20).default(10),
  MAX_RACK_COUNT: Joi.number().integer().min(1).max(10000).default(1000),
  DEFAULT_DISCOUNT_RATE: Joi.number().min(0.01).max(0.50).default(0.08),
  
  // Report generation
  REPORT_GENERATION_TIMEOUT_MS: Joi.number().integer().min(5000).default(300000), // 5 minutes
  MAX_CONCURRENT_REPORTS: Joi.number().integer().min(1).default(10),
  REPORT_CLEANUP_INTERVAL_HOURS: Joi.number().integer().min(1).default(24),
  
  // Security headers
  CONTENT_SECURITY_POLICY: Joi.string().default("default-src 'self'"),
  X_FRAME_OPTIONS: Joi.string().default('DENY'),
  
  // Development settings
  ENABLE_SWAGGER: Joi.boolean().default(false),
  ENABLE_DEBUG_ROUTES: Joi.boolean().default(false),
}).unknown(true); // Allow additional environment variables

// Validate environment variables
const { error, value: env } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment configuration error: ${error.message}`);
}

// Export typed configuration object
export const config = {
  // Environment
  nodeEnv: env.NODE_ENV as 'development' | 'staging' | 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  
  // Server
  server: {
    port: env.PORT,
    host: env.HOST,
    corsOrigins: env.CORS_ORIGINS.split(',').map((origin: string) => origin.trim()),
  },
  
  // Security
  security: {
    jwtSecret: env.JWT_SECRET,
    encryptionKey: env.ENCRYPTION_KEY,
    passwordMinLength: env.ADMIN_PASSWORD_MIN_LENGTH,
    adminSessionTimeoutHours: env.ADMIN_SESSION_TIMEOUT_HOURS,
  },
  
  // Database
  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    pool: {
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
      idleTimeoutMs: env.DB_IDLE_TIMEOUT,
      connectTimeoutMs: env.DB_CONNECT_TIMEOUT,
    },
  },
  
  // Redis
  redis: {
    url: env.REDIS_URL,
    prefix: env.REDIS_PREFIX,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    adminMax: env.RATE_LIMIT_ADMIN_MAX,
  },
  
  // Sessions
  sessions: {
    timeoutHours: env.SESSION_TIMEOUT_HOURS,
    shareLinkDefaultTtlDays: env.SHARE_LINK_DEFAULT_TTL_DAYS,
  },
  
  // File storage
  storage: {
    provider: env.STORAGE_PROVIDER as 'local' | 's3' | 'gcs' | 'azure',
    basePath: env.STORAGE_BASE_PATH,
    maxFileSizeMb: env.MAX_FILE_SIZE_MB,
    aws: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION,
      bucket: env.AWS_S3_BUCKET,
    },
  },
  
  // Email
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromAddress: env.SMTP_FROM_ADDRESS,
  },
  
  // External services
  external: {
    currencyApiKey: env.CURRENCY_API_KEY,
    currencyApiUrl: env.CURRENCY_API_URL,
  },
  
  // Logging
  logging: {
    level: env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug',
    format: env.LOG_FORMAT as 'json' | 'simple' | 'combined',
  },
  
  // Metrics
  metrics: {
    enabled: env.ENABLE_METRICS,
    prefix: env.METRICS_PREFIX,
  },
  
  // Business logic
  business: {
    maxCalculationYears: env.MAX_CALCULATION_YEARS,
    maxRackCount: env.MAX_RACK_COUNT,
    defaultDiscountRate: env.DEFAULT_DISCOUNT_RATE,
  },
  
  // Reports
  reports: {
    generationTimeoutMs: env.REPORT_GENERATION_TIMEOUT_MS,
    maxConcurrent: env.MAX_CONCURRENT_REPORTS,
    cleanupIntervalHours: env.REPORT_CLEANUP_INTERVAL_HOURS,
  },
  
  // Security headers
  securityHeaders: {
    contentSecurityPolicy: env.CONTENT_SECURITY_POLICY,
    xFrameOptions: env.X_FRAME_OPTIONS,
  },
  
  // Development
  development: {
    enableSwagger: env.ENABLE_SWAGGER,
    enableDebugRoutes: env.ENABLE_DEBUG_ROUTES,
  },
} as const;

// Helper functions
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export function getEnvVarAsNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  
  return parsed;
}

export function getEnvVarAsBoolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true' || value === '1';
}

// Validate required configuration for specific environments
export function validateProductionConfig(): void {
  if (!config.isProduction) return;
  
  const requiredForProduction = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'DB_PASSWORD',
  ];
  
  const missing = requiredForProduction.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for production: ${missing.join(', ')}`
    );
  }
  
  // Additional production validations
  if (config.security.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production');
  }
  
  if (config.database.password.length < 8) {
    throw new Error('Database password must be at least 8 characters long in production');
  }
}