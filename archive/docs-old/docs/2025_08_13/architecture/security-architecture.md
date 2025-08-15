# Security Architecture - Immersion Cooling TCO Calculator

## Executive Summary

This document defines the comprehensive security architecture for the Immersion Cooling TCO Calculator, implementing defense-in-depth security principles to protect against common web application vulnerabilities while ensuring data integrity, user privacy, and system availability. The security framework addresses OWASP Top 10 vulnerabilities and implements industry best practices.

## Security Design Principles

### Core Security Principles
1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal required access rights
3. **Fail Secure**: Default to secure state on failure
4. **Zero Trust**: Verify every request and user
5. **Data Minimization**: Collect only necessary data
6. **Encryption Everywhere**: Protect data in transit and at rest
7. **Security by Design**: Built-in security from ground up

### Threat Model Overview

#### Assets to Protect
- **Calculation algorithms**: Proprietary business logic
- **Configuration data**: Equipment pricing and specifications
- **User calculations**: Potentially sensitive business information
- **System infrastructure**: Servers, databases, services
- **API endpoints**: Prevent abuse and unauthorized access

#### Threat Actors
- **External attackers**: Attempting data breach or service disruption
- **Malicious users**: Attempting to abuse or exploit the system
- **Insider threats**: Authorized users exceeding their privileges
- **Automated threats**: Bots, scrapers, and automated attack tools

#### Attack Vectors
- **Web application attacks**: XSS, CSRF, SQL injection
- **API abuse**: Rate limiting bypass, parameter manipulation
- **Authentication attacks**: Credential stuffing, session hijacking
- **Infrastructure attacks**: Network intrusion, privilege escalation
- **Data exfiltration**: Unauthorized access to sensitive information

## Authentication and Authorization Architecture

### Authentication Strategy

#### Anonymous User Model
```typescript
// Anonymous users (primary use case)
interface AnonymousSession {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  calculationCount: number;
  rateLimitTokens: number;
}

// Session management without personal data collection
class AnonymousSessionManager {
  private sessions = new Map<string, AnonymousSession>();
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  
  createSession(req: Request): string {
    const sessionId = this.generateSecureToken();
    const session: AnonymousSession = {
      sessionId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent') || 'unknown',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      calculationCount: 0,
      rateLimitTokens: 100 // Initial rate limit allowance
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }
  
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const isExpired = Date.now() - session.lastActivityAt.getTime() > this.SESSION_TIMEOUT;
    if (isExpired) {
      this.sessions.delete(sessionId);
      return false;
    }
    
    return true;
  }
  
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
}
```

#### Administrative Authentication
```typescript
// JWT-based authentication for admin users
interface AdminUser {
  userId: string;
  email: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  lastLoginAt: Date;
  mfaEnabled: boolean;
}

interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  permissions: string[];
  iat: number; // Issued at
  exp: number; // Expires at
  jti: string; // JWT ID for revocation
}

class AdminAuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_EXPIRY = '1h';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  
  async authenticate(email: string, password: string, mfaCode?: string): Promise<AuthResult> {
    // Hash password with bcrypt for comparison
    const user = await this.getUserByEmail(email);
    if (!user || !await bcrypt.compare(password, user.hashedPassword)) {
      await this.logFailedLogin(email, 'invalid_credentials');
      throw new AuthenticationError('Invalid credentials');
    }
    
    // Check MFA if enabled
    if (user.mfaEnabled && !mfaCode) {
      return { requiresMFA: true };
    }
    
    if (user.mfaEnabled && !await this.verifyMFACode(user.userId, mfaCode)) {
      await this.logFailedLogin(email, 'invalid_mfa');
      throw new AuthenticationError('Invalid MFA code');
    }
    
    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    await this.updateLastLogin(user.userId);
    await this.logSuccessfulLogin(user.userId);
    
    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user)
    };
  }
  
  generateAccessToken(user: AdminUser): string {
    const payload: JWTPayload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      jti: crypto.randomUUID()
    };
    
    return jwt.sign(payload, this.JWT_SECRET, { algorithm: 'HS256' });
  }
}
```

### Authorization Framework

#### Role-Based Access Control (RBAC)
```typescript
// Permission definitions
enum Permission {
  CONFIG_READ = 'config:read',
  CONFIG_WRITE = 'config:write',
  CONFIG_DELETE = 'config:delete',
  ANALYTICS_READ = 'analytics:read',
  USER_MANAGE = 'user:manage',
  SYSTEM_ADMIN = 'system:admin'
}

// Role definitions
const ROLES = {
  admin: {
    name: 'Administrator',
    permissions: [
      Permission.CONFIG_READ,
      Permission.CONFIG_WRITE,
      Permission.ANALYTICS_READ
    ]
  },
  super_admin: {
    name: 'Super Administrator',
    permissions: Object.values(Permission) // All permissions
  }
} as const;

// Authorization middleware
function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }
    
    if (!user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      });
    }
    
    next();
  };
}

// Usage in routes
app.get('/api/v1/admin/config', 
  authenticateJWT,
  requirePermission(Permission.CONFIG_READ),
  getConfiguration
);

app.post('/api/v1/admin/config',
  authenticateJWT,
  requirePermission(Permission.CONFIG_WRITE),
  validateConfigUpdate,
  updateConfiguration
);
```

## Input Validation and Sanitization

### Multi-Layer Validation Architecture

#### Client-Side Validation
```typescript
// React form validation with Yup
import * as Yup from 'yup';

const calculationValidationSchema = Yup.object({
  airCooling: Yup.object({
    rackCount: Yup.number()
      .min(1, 'Must have at least 1 rack')
      .max(1000, 'Maximum 1000 racks supported')
      .integer('Rack count must be a whole number')
      .required('Rack count is required'),
    powerPerRackKW: Yup.number()
      .min(0.5, 'Minimum power per rack is 0.5kW')
      .max(50, 'Maximum power per rack is 50kW')
      .when('inputMethod', {
        is: 'rack_count',
        then: Yup.number().required('Power per rack is required')
      })
  }),
  immersionCooling: Yup.object({
    tankConfigurations: Yup.array().of(
      Yup.object({
        size: Yup.string()
          .matches(/^[1-9]\d*U$/, 'Invalid rack size format')
          .required('Tank size is required'),
        quantity: Yup.number()
          .min(1, 'Minimum 1 tank required')
          .max(100, 'Maximum 100 tanks per configuration')
          .integer('Quantity must be a whole number')
          .required('Quantity is required'),
        powerDensityKWPerU: Yup.number()
          .min(0.5, 'Minimum power density is 0.5kW/U')
          .max(5.0, 'Maximum power density is 5.0kW/U')
          .required('Power density is required')
      })
    ).min(1, 'At least one tank configuration required')
  }),
  financial: Yup.object({
    analysisYears: Yup.number()
      .min(1, 'Minimum analysis period is 1 year')
      .max(10, 'Maximum analysis period is 10 years')
      .integer('Analysis years must be a whole number')
      .required('Analysis period is required'),
    discountRate: Yup.number()
      .min(0.01, 'Discount rate must be at least 1%')
      .max(0.20, 'Discount rate cannot exceed 20%')
      .required('Discount rate is required'),
    currency: Yup.string()
      .oneOf(['USD', 'EUR', 'SAR', 'AED'], 'Invalid currency')
      .required('Currency is required')
  })
});

// Real-time validation in React component
const CalculationForm: React.FC = () => {
  const { values, errors, touched, handleChange, handleBlur } = useFormik({
    initialValues: initialCalculationValues,
    validationSchema: calculationValidationSchema,
    onSubmit: handleSubmit
  });
  
  return (
    <Form>
      <TextField
        name="airCooling.rackCount"
        value={values.airCooling.rackCount}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.airCooling?.rackCount && !!errors.airCooling?.rackCount}
        helperText={touched.airCooling?.rackCount && errors.airCooling?.rackCount}
        inputProps={{
          min: 1,
          max: 1000,
          step: 1
        }}
      />
    </Form>
  );
};
```

#### Server-Side Validation
```typescript
// Express-validator middleware for comprehensive server-side validation
import { body, validationResult, sanitizeBody } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

const calculationValidationRules = [
  // Air cooling validation
  body('configuration.airCooling.rackCount')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Rack count must be between 1 and 1000')
    .toInt(),
  
  body('configuration.airCooling.powerPerRackKW')
    .isFloat({ min: 0.5, max: 50 })
    .withMessage('Power per rack must be between 0.5 and 50 kW')
    .toFloat(),
  
  // Immersion cooling validation
  body('configuration.immersionCooling.tankConfigurations')
    .isArray({ min: 1, max: 20 })
    .withMessage('Must provide 1-20 tank configurations'),
  
  body('configuration.immersionCooling.tankConfigurations.*.size')
    .matches(/^([1-9]|1[0-9]|2[0-3])U$/)
    .withMessage('Tank size must be between 1U and 23U'),
  
  body('configuration.immersionCooling.tankConfigurations.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Tank quantity must be between 1 and 100')
    .toInt(),
  
  // Financial validation
  body('configuration.financial.analysisYears')
    .isInt({ min: 1, max: 10 })
    .withMessage('Analysis period must be between 1 and 10 years')
    .toInt(),
  
  body('configuration.financial.discountRate')
    .isFloat({ min: 0.01, max: 0.20 })
    .withMessage('Discount rate must be between 1% and 20%')
    .toFloat(),
  
  body('configuration.financial.currency')
    .isIn(['USD', 'EUR', 'SAR', 'AED'])
    .withMessage('Invalid currency code'),
  
  // Locale validation
  body('locale')
    .isIn(['en', 'ar'])
    .withMessage('Locale must be either "en" or "ar"')
    .optional(),
  
  // XSS protection for any string fields
  sanitizeBody('configuration.description').customSanitizer(value => {
    return value ? DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }) : value;
  })
];

// Validation middleware
const validateCalculation = [
  ...calculationValidationRules,
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input parameters',
          details: errors.array().map(error => ({
            field: error.param,
            message: error.msg,
            value: error.value,
            location: error.location
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.id
        }
      });
    }
    
    next();
  }
];
```

### SQL Injection Prevention

#### Parameterized Queries
```typescript
// Using parameterized queries with pg (PostgreSQL client)
class CalculationRepository {
  private db: Pool;
  
  async saveCalculationSession(session: CalculationSession): Promise<string> {
    const query = `
      INSERT INTO tco_core.calculation_sessions 
      (id, session_token, configuration, results, locale, currency, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const values = [
      session.id,
      session.sessionToken,
      JSON.stringify(session.configuration),
      JSON.stringify(session.results),
      session.locale,
      session.currency,
      session.createdAt,
      session.expiresAt
    ];
    
    try {
      const result = await this.db.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      throw new DatabaseError('Failed to save calculation session', error);
    }
  }
  
  async getEquipmentConfiguration(
    category: string, 
    currency: string, 
    region?: string
  ): Promise<EquipmentConfig[]> {
    const query = `
      SELECT id, category, subcategory, item_code, display_name, 
             specifications, base_pricing, regional_adjustments
      FROM tco_config.equipment_configurations 
      WHERE category = $1 
        AND status = 'active'
        AND (expiry_date IS NULL OR expiry_date > NOW())
        AND ($3::text IS NULL OR regional_adjustments ? $3)
      ORDER BY item_code
    `;
    
    const values = [category, currency, region];
    
    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapEquipmentConfig(row, currency, region));
  }
}
```

#### Query Builder with Type Safety
```typescript
// Using Prisma for type-safe database operations
import { PrismaClient } from '@prisma/client';

class PrismaRepository {
  private prisma = new PrismaClient();
  
  async createCalculationSession(data: CreateSessionData) {
    return await this.prisma.calculationSession.create({
      data: {
        sessionToken: data.sessionToken,
        configuration: data.configuration as Prisma.JsonObject,
        results: data.results as Prisma.JsonObject,
        locale: data.locale,
        currency: data.currency,
        expiresAt: data.expiresAt
      }
    });
  }
  
  async findEquipmentByCategory(category: string, filters: EquipmentFilters) {
    return await this.prisma.equipmentConfiguration.findMany({
      where: {
        category: {
          equals: category as EquipmentCategory
        },
        status: 'active',
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: new Date() } }
        ],
        ...(filters.region && {
          regionalAdjustments: {
            path: [filters.region],
            not: Prisma.JsonNull
          }
        })
      },
      orderBy: {
        itemCode: 'asc'
      }
    });
  }
}
```

## Cross-Site Scripting (XSS) Prevention

### Content Security Policy (CSP)
```typescript
// Comprehensive CSP implementation
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for React development
      'cdn.jsdelivr.net',
      'cdnjs.cloudflare.com'
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for Material-UI
      'fonts.googleapis.com',
      'cdn.jsdelivr.net'
    ],
    fontSrc: [
      "'self'",
      'fonts.gstatic.com',
      'cdn.jsdelivr.net'
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:' // For logos and external images in reports
    ],
    connectSrc: [
      "'self'",
      process.env.API_BASE_URL || 'http://localhost:3001'
    ],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  },
  reportOnly: false // Set to true during testing
}));

// CSP violation reporting
app.use('/csp-report', express.json(), (req, res) => {
  console.log('CSP Violation:', JSON.stringify(req.body, null, 2));
  // Log to security monitoring system
  securityLogger.warn('CSP Violation', {
    violation: req.body,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  res.status(204).end();
});
```

### Input Sanitization
```typescript
// DOMPurify for HTML sanitization
import DOMPurify from 'isomorphic-dompurify';

class InputSanitizer {
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  }
  
  static sanitizeJSON(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeHTML(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeJSON(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeHTML(key)] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}

// Middleware for request sanitization
const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = InputSanitizer.sanitizeJSON(req.body);
  }
  
  if (req.query) {
    req.query = InputSanitizer.sanitizeJSON(req.query);
  }
  
  next();
};
```

### Output Encoding
```typescript
// React output encoding (built-in XSS protection)
const CalculationResults: React.FC<{ results: CalculationData }> = ({ results }) => {
  return (
    <div>
      {/* React automatically escapes these values */}
      <h3>{results.title}</h3>
      <p>{results.description}</p>
      
      {/* For raw HTML (avoid when possible) */}
      <div 
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(results.htmlContent)
        }}
      />
      
      {/* JSON data display */}
      <pre>{JSON.stringify(results.data, null, 2)}</pre>
    </div>
  );
};
```

## Cross-Site Request Forgery (CSRF) Protection

### CSRF Token Implementation
```typescript
import csrf from 'csurf';

// CSRF middleware setup
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  }
});

// Apply CSRF protection to state-changing endpoints
app.use('/api/v1/admin', csrfProtection);
app.use('/api/v1/calculations/save', csrfProtection);

// Provide CSRF token to frontend
app.get('/api/v1/csrf-token', csrfProtection, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      csrfToken: req.csrfToken()
    }
  });
});

// Frontend CSRF token handling
class CSRFService {
  private static token: string | null = null;
  
  static async getToken(): Promise<string> {
    if (!this.token) {
      const response = await fetch('/api/v1/csrf-token', {
        credentials: 'include'
      });
      const data = await response.json();
      this.token = data.data.csrfToken;
    }
    return this.token;
  }
  
  static async makeSecureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        'X-CSRF-Token': token,
        'Content-Type': 'application/json'
      }
    });
  }
}
```

## Rate Limiting and DDoS Protection

### Multi-Layer Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// General API rate limiting
const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args)
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use forwarded IP if behind proxy
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Calculation-specific rate limiting (more restrictive)
const calculationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args)
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 calculations per minute
  message: {
    error: {
      code: 'CALCULATION_RATE_LIMIT',
      message: 'Too many calculations, please wait before trying again.',
      retryAfter: '1 minute'
    }
  }
});

// Progressive delay for repeated requests
const speedLimiter = slowDown({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args)
  }),
  windowMs: 15 * 60 * 1000,
  delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
  delayMs: 500 // Add 500ms delay for each request after delayAfter
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/v1/calculations/calculate', calculationLimiter);
app.use('/api/', speedLimiter);

// Advanced rate limiting with custom logic
class AdaptiveRateLimiter {
  private redis: Redis;
  
  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }
  
  async checkRateLimit(
    identifier: string, 
    tier: 'basic' | 'premium' = 'basic'
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${tier}:${identifier}`;
    const window = 60 * 1000; // 1 minute
    const limits = {
      basic: { requests: 10, burst: 15 },
      premium: { requests: 50, burst: 100 }
    };
    
    const limit = limits[tier];
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    
    // Clean old entries
    pipeline.zremrangebyscore(key, 0, now - window);
    
    // Count current requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}_${Math.random()}`);
    
    // Set expiry
    pipeline.expire(key, Math.ceil(window / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results?.[1]?.[1] as number || 0;
    
    const allowed = currentCount <= limit.requests;
    const remaining = Math.max(0, limit.requests - currentCount);
    
    return {
      allowed,
      remaining,
      resetTime: now + window,
      tier
    };
  }
}
```

## Session Security

### Secure Session Management
```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';

// Redis session store
const sessionStore = new RedisStore({
  client: redis,
  prefix: 'tco_session:',
  ttl: 24 * 60 * 60 // 24 hours
});

// Session configuration
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET!,
  name: 'tco_session', // Don't use default name
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS access to cookies
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));

// Session validation middleware
const validateSession = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_SESSION',
        message: 'Session is invalid or expired'
      }
    });
  }
  
  // Check for session hijacking indicators
  const currentIP = req.ip;
  const currentUserAgent = req.get('User-Agent');
  
  if (req.session.ipAddress && req.session.ipAddress !== currentIP) {
    // IP changed - possible session hijacking
    req.session.destroy(() => {
      res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_SECURITY_VIOLATION',
          message: 'Session terminated due to security violation'
        }
      });
    });
    return;
  }
  
  // Update session tracking
  req.session.ipAddress = currentIP;
  req.session.userAgent = currentUserAgent;
  req.session.lastActivity = new Date();
  
  next();
};
```

## Data Encryption

### Encryption at Rest
```typescript
import crypto from 'crypto';

class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY = crypto.scryptSync(process.env.ENCRYPTION_PASSWORD!, 'salt', 32);
  
  static encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, this.KEY, { iv });
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex')
    };
  }
  
  static decrypt(encryptedData: EncryptedData): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipherGcm(this.ALGORITHM, this.KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Database encryption for sensitive fields
class EncryptedRepository {
  async saveConfigurationSecure(config: SensitiveConfig): Promise<void> {
    const encryptedPricing = DataEncryption.encrypt(JSON.stringify(config.pricing));
    
    await this.db.query(`
      INSERT INTO equipment_configurations 
      (id, category, specifications, encrypted_pricing)
      VALUES ($1, $2, $3, $4)
    `, [
      config.id,
      config.category,
      config.specifications,
      JSON.stringify(encryptedPricing)
    ]);
  }
  
  async getConfigurationSecure(id: string): Promise<SensitiveConfig> {
    const result = await this.db.query(`
      SELECT id, category, specifications, encrypted_pricing
      FROM equipment_configurations
      WHERE id = $1
    `, [id]);
    
    const row = result.rows[0];
    const encryptedPricing = JSON.parse(row.encrypted_pricing);
    const pricing = JSON.parse(DataEncryption.decrypt(encryptedPricing));
    
    return {
      id: row.id,
      category: row.category,
      specifications: row.specifications,
      pricing
    };
  }
}
```

### HTTPS/TLS Configuration
```typescript
// Express HTTPS setup
import https from 'https';
import fs from 'fs';

// TLS configuration
const tlsOptions = {
  key: fs.readFileSync(process.env.TLS_KEY_PATH!),
  cert: fs.readFileSync(process.env.TLS_CERT_PATH!),
  // Intermediate certificates if needed
  ca: process.env.TLS_CA_PATH ? fs.readFileSync(process.env.TLS_CA_PATH) : undefined,
  
  // Security settings
  honorCipherOrder: true,
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
  ].join(':')
};

// Create HTTPS server
const httpsServer = https.createServer(tlsOptions, app);
httpsServer.listen(443, () => {
  console.log('HTTPS Server running on port 443');
});

// Redirect HTTP to HTTPS
import http from 'http';
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, {
    Location: `https://${req.headers.host}${req.url}`
  });
  res.end();
});
httpServer.listen(80);
```

## Security Headers

### Comprehensive Security Headers
```typescript
import helmet from 'helmet';

app.use(helmet({
  // Content Security Policy (defined earlier)
  contentSecurityPolicy: { /* CSP configuration */ },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // XSS Filter
  xssFilter: true,
  
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'same-origin' },
  
  // Feature Policy / Permissions Policy
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: []
  }
}));

// Custom security headers
app.use((req, res, next) => {
  // Cache control for sensitive endpoints
  if (req.path.startsWith('/api/v1/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  
  // API-specific headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Rate-Limit-Policy', 'standard');
  
  next();
});
```

## Security Monitoring and Logging

### Security Event Logging
```typescript
import winston from 'winston';

// Security-focused logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tco-calculator-security' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security event types
enum SecurityEvent {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  CSRF_TOKEN_MISMATCH = 'csrf_token_mismatch',
  UNAUTHORIZED_ACCESS = 'unauthorized_access'
}

class SecurityMonitor {
  static logSecurityEvent(
    event: SecurityEvent,
    details: any,
    req?: Request,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    const logEntry = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      details,
      request: req ? {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        headers: this.sanitizeHeaders(req.headers)
      } : null
    };
    
    securityLogger.warn('Security Event', logEntry);
    
    // Send alerts for critical events
    if (severity === 'critical') {
      this.sendSecurityAlert(logEntry);
    }
  }
  
  private static sanitizeHeaders(headers: any) {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    return sanitized;
  }
  
  private static async sendSecurityAlert(event: any) {
    // Integration with alerting system (Slack, email, etc.)
    console.log('CRITICAL SECURITY ALERT:', event);
  }
}

// Security middleware for monitoring
const securityMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /exec\s*\(/i
  ];
  
  const requestStr = JSON.stringify({
    query: req.query,
    body: req.body,
    params: req.params
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestStr)) {
      SecurityMonitor.logSecurityEvent(
        SecurityEvent.SUSPICIOUS_ACTIVITY,
        {
          pattern: pattern.toString(),
          matchedContent: requestStr.match(pattern)?.[0],
          fullRequest: requestStr.substring(0, 500) // Limit log size
        },
        req,
        'high'
      );
      break;
    }
  }
  
  next();
};

app.use(securityMonitoringMiddleware);
```

## Vulnerability Management

### Dependency Security
```json
{
  "scripts": {
    "audit": "npm audit",
    "audit-fix": "npm audit fix",
    "security-check": "npm audit --audit-level moderate",
    "snyk-test": "snyk test",
    "snyk-monitor": "snyk monitor"
  },
  "devDependencies": {
    "snyk": "^1.1000.0",
    "@types/helmet": "^4.0.0",
    "audit-ci": "^6.6.1"
  }
}
```

### Automated Security Testing
```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  security-audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run npm audit
        run: npm audit --audit-level moderate
        
      - name: Run Snyk security test
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=medium
          
      - name: Run OWASP ZAP baseline scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
          
      - name: Upload security scan results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: security-scan-results
          path: |
            snyk-results.json
            zap-baseline-report.html
```

This comprehensive security architecture provides multiple layers of protection against common web application vulnerabilities while maintaining usability and performance. Regular security audits and monitoring ensure ongoing protection as threats evolve.