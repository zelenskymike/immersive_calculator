/**
 * Security middleware for Express application
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csrf from 'csurf';
import DOMPurify from 'isomorphic-dompurify';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import crypto from 'crypto';

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

// CSRF Protection middleware
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: config.server.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req) => {
    // Check multiple possible locations for CSRF token
    return req.body._csrf || 
           req.query._csrf || 
           req.headers['csrf-token'] ||
           req.headers['x-csrf-token'] ||
           req.headers['x-xsrf-token'];
  },
});

// CSRF token generation endpoint
export const generateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.csrfToken();
    res.json({
      success: true,
      data: {
        csrfToken: token,
        expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      },
    });
  } catch (error) {
    logger.error('CSRF token generation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to generate CSRF token',
      },
    });
  }
};

// XSS Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Basic XSS protection - sanitize HTML content
      return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [], // No attributes allowed
      });
    } else if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    } else if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          sanitized[key] = sanitizeValue(value[key]);
        }
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (req.query.hasOwnProperty(key)) {
        req.query[key] = sanitizeValue(req.query[key]);
      }
    }
  }

  // Sanitize URL parameters
  if (req.params) {
    for (const key in req.params) {
      if (req.params.hasOwnProperty(key)) {
        req.params[key] = sanitizeValue(req.params[key]);
      }
    }
  }

  next();
};

// SQL Injection Protection middleware
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /('|(\\)|;|--|\*|=)/gi,
    /(\bOR\b|\bAND\b).*[=<>]/gi,
    /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/gi,
  ];

  const checkForSQLInjection = (value: string): boolean => {
    return sqlInjectionPatterns.some(pattern => pattern.test(value));
  };

  const checkValue = (obj: any, path = ''): boolean => {
    if (typeof obj === 'string') {
      if (checkForSQLInjection(obj)) {
        logSecurityEvent('sql_injection_attempt', 'error', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          suspiciousValue: obj,
          fieldPath: path,
        });
        return true;
      }
    } else if (Array.isArray(obj)) {
      return obj.some((item, index) => checkValue(item, `${path}[${index}]`));
    } else if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj).some(([key, value]) => 
        checkValue(value, path ? `${path}.${key}` : key)
      );
    }
    return false;
  };

  // Check all input sources
  const sources = [
    { data: req.body, name: 'body' },
    { data: req.query, name: 'query' },
    { data: req.params, name: 'params' },
  ];

  for (const source of sources) {
    if (source.data && checkValue(source.data, source.name)) {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: 'Potentially malicious input detected',
        },
      });
    }
  }

  next();
};

// Basic admin authentication middleware
export const basicAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      },
    });
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [username, password] = credentials.split(':');

  if (username !== config.admin.username || password !== config.admin.password) {
    logSecurityEvent('admin_auth_failed', 'warn', {
      ip: req.ip,
      username,
      path: req.path,
    });

    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid credentials',
      },
    });
  }

  logSecurityEvent('admin_auth_success', 'info', {
    ip: req.ip,
    username,
    path: req.path,
  });

  next();
};

// API key authentication middleware
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'API key required',
      },
    });
  }

  // Validate API key format (should be UUID v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(apiKey)) {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid API key format',
      },
    });
  }

  // In a real implementation, you would validate against a database
  const validApiKeys = config.apiKeys || [];
  if (!validApiKeys.includes(apiKey)) {
    logSecurityEvent('invalid_api_key', 'warn', {
      ip: req.ip,
      apiKey: apiKey.substring(0, 8) + '...',
      path: req.path,
    });

    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid API key',
      },
    });
  }

  // Add API key info to request for logging
  (req as any).apiKey = apiKey;
  next();
};

// Request signing middleware for high-security operations
export const requestSigningAuth = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-request-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const nonce = req.headers['x-nonce'] as string;

  if (!signature || !timestamp || !nonce) {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Request signing headers required',
      },
    });
  }

  // Validate timestamp (prevent replay attacks)
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - requestTime);

  if (timeDiff > 300000) { // 5 minutes
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Request timestamp expired',
      },
    });
  }

  // Check nonce to prevent replay attacks (in production, store in Redis)
  const nonceKey = `nonce:${nonce}`;
  
  redis.getClient().get(nonceKey).then(existingNonce => {
    if (existingNonce) {
      logSecurityEvent('replay_attack_attempt', 'error', {
        ip: req.ip,
        nonce,
        timestamp,
        path: req.path,
      });

      return res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Request replay detected',
        },
      });
    }

    // Store nonce with expiration
    redis.getClient().setEx(nonceKey, 300, 'used'); // 5 minutes expiration

    // Verify signature
    const secret = config.security.requestSigningSecret;
    const payload = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}:${timestamp}:${nonce}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logSecurityEvent('invalid_request_signature', 'error', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      return res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Invalid request signature',
        },
      });
    }

    next();
  }).catch(error => {
    logger.error('Nonce validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Authentication service unavailable',
      },
    });
  });
};

// Enhanced validation rules with security considerations
export const enhancedValidationRules = {
  ...validationRules,
  
  // Report format validation
  reportFormat: () => body('format')
    .isIn(['pdf', 'excel'])
    .withMessage('Report format must be pdf or excel'),
    
  // Sanitized string validation
  sanitizedString: (field: string, maxLength: number = 1000) => 
    body(field)
      .isString()
      .isLength({ max: maxLength })
      .trim()
      .escape()
      .withMessage(`${field} must be a string with maximum ${maxLength} characters`),
      
  // Safe HTML validation (for rich text fields)
  safeHTML: (field: string) => 
    body(field)
      .optional()
      .isString()
      .customSanitizer((value) => {
        return DOMPurify.sanitize(value, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u'],
          ALLOWED_ATTR: [],
        });
      })
      .withMessage(`${field} contains invalid HTML`),
};

// Security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Add request ID for tracking
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);

  // Monitor for suspicious patterns
  const suspiciousPatterns = {
    userAgent: /bot|crawler|spider|scraper/i,
    path: /\.(php|asp|jsp|cgi)$/i,
    queryParams: /script|alert|onerror|javascript/i,
  };

  let suspiciousActivity = false;
  const suspiciousFlags: string[] = [];

  // Check User-Agent
  const userAgent = req.get('User-Agent') || '';
  if (suspiciousPatterns.userAgent.test(userAgent)) {
    suspiciousFlags.push('suspicious_user_agent');
    suspiciousActivity = true;
  }

  // Check path
  if (suspiciousPatterns.path.test(req.path)) {
    suspiciousFlags.push('suspicious_path');
    suspiciousActivity = true;
  }

  // Check query parameters
  const queryString = JSON.stringify(req.query);
  if (suspiciousPatterns.queryParams.test(queryString)) {
    suspiciousFlags.push('suspicious_query');
    suspiciousActivity = true;
  }

  if (suspiciousActivity) {
    logSecurityEvent('suspicious_activity', 'warn', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent,
      flags: suspiciousFlags,
      requestId: req.id,
    });
  }

  // Log response time and status
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      logSecurityEvent('slow_request', 'info', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        requestId: req.id,
      });
    }

    // Log error responses
    if (res.statusCode >= 400) {
      logSecurityEvent('error_response', 'info', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        requestId: req.id,
      });
    }
  });

  next();
};