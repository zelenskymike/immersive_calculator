/**
 * Security middleware for Express application
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

import { config } from '@/config/environment';
import { redis } from '@/config/database';
import { logger, logSecurityEvent } from '@/utils/logger';
import { ErrorCode } from '@shared/types';

// Basic security headers middleware using Helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'api.exchangerate-api.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Rate limiting middleware with Redis backing
export const createRateLimit = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    max = config.rateLimit.maxRequests,
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = true,
  } = options || {};

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    
    // Use Redis for distributed rate limiting
    store: {
      incr: async (key: string) => {
        const redisKey = `rate_limit:${key}`;
        const current = await redis.getClient().incr(redisKey);
        if (current === 1) {
          await redis.getClient().pExpire(redisKey, windowMs);
        }
        return { totalHits: current, resetTime: Date.now() + windowMs };
      },
      decrement: async (key: string) => {
        await redis.getClient().decr(`rate_limit:${key}`);
      },
      resetKey: async (key: string) => {
        await redis.getClient().del(`rate_limit:${key}`);
      },
      resetAll: async () => {
        // This is a no-op for Redis store since keys expire automatically
      },
    },
    
    onLimitReached: (req: Request) => {
      logSecurityEvent('rate_limit_exceeded', 'warn', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
    },
  });
};

// Different rate limits for different endpoints
export const apiRateLimit = createRateLimit({
  max: config.rateLimit.maxRequests,
});

export const calculationRateLimit = createRateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 calculations per minute
  message: 'Too many calculation requests, please wait before submitting another.',
});

export const reportRateLimit = createRateLimit({
  windowMs: 300000, // 5 minutes
  max: 5, // 5 reports per 5 minutes
  message: 'Too many report generation requests, please wait before requesting another.',
});

export const adminRateLimit = createRateLimit({
  max: config.rateLimit.adminMax,
  message: 'Too many admin requests, please try again later.',
});

// Input validation middleware
export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    logSecurityEvent('validation_failed', 'warn', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      errors: errors.array(),
    });

    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input parameters',
        details: errors.array(),
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
      },
    });
  };
};

// Common validation rules
export const validationRules = {
  // UUID validation
  uuid: (field: string) => param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  
  // Locale validation
  locale: () => body('locale').optional().isIn(['en', 'ar']).withMessage('Locale must be en or ar'),
  
  // Currency validation
  currency: () => body('currency').optional().isIn(['USD', 'EUR', 'SAR', 'AED'])
    .withMessage('Currency must be one of: USD, EUR, SAR, AED'),
  
  // Calculation configuration validation
  calculationConfig: () => [
    body('configuration').isObject().withMessage('Configuration must be an object'),
    body('configuration.air_cooling').isObject().withMessage('Air cooling configuration is required'),
    body('configuration.immersion_cooling').isObject().withMessage('Immersion cooling configuration is required'),
    body('configuration.financial').isObject().withMessage('Financial configuration is required'),
    
    // Air cooling validation
    body('configuration.air_cooling.rack_count')
      .optional()
      .isInt({ min: 1, max: config.business.maxRackCount })
      .withMessage(`Rack count must be between 1 and ${config.business.maxRackCount}`),
    
    body('configuration.air_cooling.power_per_rack_kw')
      .optional()
      .isFloat({ min: 0.1, max: 100 })
      .withMessage('Power per rack must be between 0.1 and 100 kW'),
    
    body('configuration.air_cooling.total_power_kw')
      .optional()
      .isFloat({ min: 1, max: 100000 })
      .withMessage('Total power must be between 1 and 100,000 kW'),
    
    // Financial validation
    body('configuration.financial.analysis_years')
      .isInt({ min: 1, max: config.business.maxCalculationYears })
      .withMessage(`Analysis years must be between 1 and ${config.business.maxCalculationYears}`),
    
    body('configuration.financial.discount_rate')
      .optional()
      .isFloat({ min: 0.01, max: 0.30 })
      .withMessage('Discount rate must be between 0.01 and 0.30'),
    
    body('configuration.financial.currency')
      .isIn(['USD', 'EUR', 'SAR', 'AED'])
      .withMessage('Currency must be one of: USD, EUR, SAR, AED'),
  ],
  
  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('sort')
      .optional()
      .isString()
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .withMessage('Sort field must be a valid field name'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc'),
  ],
  
  // Email validation
  email: (field: string) => body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  // Password validation
  password: () => body('password')
    .isLength({ min: config.security.passwordMinLength })
    .withMessage(`Password must be at least ${config.security.passwordMinLength} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  // Report validation
  reportRequest: () => [
    body('session_id').isUUID().withMessage('Session ID must be a valid UUID'),
    body('template')
      .optional()
      .isIn(['standard', 'detailed', 'executive_summary'])
      .withMessage('Template must be one of: standard, detailed, executive_summary'),
    body('branding.company_name')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Company name must be a string with maximum 100 characters'),
    body('branding.logo_url')
      .optional()
      .isURL()
      .withMessage('Logo URL must be a valid URL'),
  ],
};

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (config.server.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logSecurityEvent('cors_blocked', 'warn', { origin });
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
};

// IP whitelisting middleware (for admin routes)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logSecurityEvent('ip_blocked', 'warn', {
        ip: clientIP,
        path: req.path,
        method: req.method,
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Access denied',
        },
      });
    }
    
    next();
  };
};

// Content-Type validation middleware
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (req.method === 'POST' || req.method === 'PUT') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Invalid Content-Type header',
          },
        });
      }
    }
    
    next();
  };
};

// Request size limiting middleware
export const limitRequestSize = (maxSizeBytes: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      logSecurityEvent('request_too_large', 'warn', {
        ip: req.ip,
        contentLength,
        maxSize: maxSizeBytes,
        path: req.path,
      });
      
      return res.status(413).json({
        success: false,
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: 'Request entity too large',
        },
      });
    }
    
    next();
  };
};

// Security event middleware for sensitive operations
export const logSensitiveOperation = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    logSecurityEvent('sensitive_operation', 'info', {
      operation,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    
    next();
  };
};