/**
 * Authentication routes
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

import { db, redis } from '@/config/database';
import { config } from '@/config/environment';
import { logger, createContextLogger } from '@/utils/logger';
import { AppError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/types/auth';

const router = express.Router();
const authLogger = createContextLogger('auth');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 login attempts per window
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Register new user
 */
router.post('/register', authLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
], async (req, res, next) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { email, password, name } = req.body;
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent') || '';

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists with this email', 409, 'USER_EXISTS');
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name, 'user', true, false]
    );

    const user = result.rows[0];

    // Log registration
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, 'REGISTER', 'user', user.id, { email }, clientIP, userAgent]
    );

    authLogger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      ip: clientIP
    });

    // Return user data (without password)
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * User login
 */
router.post('/login', loginLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res, next) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { email, password } = req.body;
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent') || '';

    // Find user
    const userResult = await db.query(
      `SELECT id, email, password_hash, name, role, is_active, email_verified, last_login
       FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // Log failed login attempt
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, 'LOGIN_FAILED', 'user', user.id, { reason: 'invalid_password' }, clientIP, userAgent]
      );
      
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(tokenPayload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
      issuer: 'tco-calculator',
      audience: 'tco-calculator-users'
    });

    // Create session in database
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    const sessionResult = await db.query(
      'SELECT create_user_session($1, $2, $3, $4, $5) as session_id',
      [user.id, accessToken, expiresAt, clientIP, userAgent]
    );

    const sessionId = sessionResult.rows[0].session_id;

    // Store session in Redis for quick access
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      createdAt: new Date().toISOString()
    };

    await redis.set(
      `session:${accessToken}`,
      JSON.stringify(sessionData),
      7 * 24 * 60 * 60 // 7 days in seconds
    );

    // Log successful login
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, 'LOGIN_SUCCESS', 'user', user.id, { sessionId }, clientIP, userAgent]
    );

    authLogger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      sessionId,
      ip: clientIP
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLogin: user.last_login
        },
        token: accessToken,
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * User logout
 */
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.token;
    const userId = req.user?.id;
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent') || '';

    if (token) {
      // Remove session from Redis
      await redis.del(`session:${token}`);

      // Invalidate session in database
      await db.query(
        'DELETE FROM user_sessions WHERE session_token = $1',
        [token]
      );

      // Log logout
      if (userId) {
        await db.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, 'LOGOUT', 'user', userId, {}, clientIP, userAgent]
        );
      }

      authLogger.info('User logged out successfully', {
        userId,
        ip: clientIP
      });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get current user profile
 */
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const result = await db.query(
      `SELECT id, email, name, role, is_active, email_verified, last_login, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.email_verified,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Update user profile
 */
router.put('/profile', requireAuth, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Current password is required to change password'),
  body('newPassword')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
], async (req: AuthenticatedRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const userId = req.user?.id;
    const { name, currentPassword, newPassword } = req.body;
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent') || '';

    if (!userId) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get current user data
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Update name if provided
    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        throw new AppError('Current password is required to change password', 400, 'CURRENT_PASSWORD_REQUIRED');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
      }

      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      
      updates.push(`password_hash = $${paramCount++}`);
      values.push(newPasswordHash);
    }

    if (updates.length === 0) {
      throw new AppError('No updates provided', 400, 'NO_UPDATES');
    }

    // Add userId for WHERE clause
    values.push(userId);

    // Execute update
    const updateResult = await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount}
       RETURNING id, email, name, role, updated_at`,
      values
    );

    const updatedUser = updateResult.rows[0];

    // Log profile update
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'PROFILE_UPDATE', 'user', userId, { fields: updates.map(u => u.split(' = ')[0]) }, clientIP, userAgent]
    );

    authLogger.info('User profile updated successfully', {
      userId,
      updatedFields: updates.map(u => u.split(' = ')[0]),
      ip: clientIP
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Verify JWT token validity
 */
router.post('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token not provided', 401, 'TOKEN_MISSING');
    }

    const token = authHeader.substring(7);

    // Check if token exists in Redis
    const sessionData = await redis.get(`session:${token}`);
    if (!sessionData) {
      throw new AppError('Invalid or expired token', 401, 'TOKEN_INVALID');
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
    
    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        },
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401, 'TOKEN_INVALID'));
    }
    next(error);
  }
});

export default router;