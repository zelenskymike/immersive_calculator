/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';

import { logger, logError } from '@/utils/logger';
import { ErrorCode } from '@shared/types';
import { config } from '@/config/environment';

// Custom error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes for different scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, ErrorCode.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, ErrorCode.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, ErrorCode.ALREADY_EXISTS);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 503, ErrorCode.DATABASE_ERROR);
  }
}

export class CalculationError extends AppError {
  constructor(message: string = 'Calculation failed') {
    super(message, 422, ErrorCode.CALCULATION_ERROR);
  }
}

// Error response formatter
const formatErrorResponse = (
  error: AppError | Error,
  requestId?: string
): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    request_id?: string;
  };
} => {
  const isAppError = error instanceof AppError;
  
  return {
    success: false,
    error: {
      code: isAppError ? error.code : ErrorCode.INTERNAL_ERROR,
      message: isAppError ? error.message : 'Internal server error',
      details: isAppError && config.isDevelopment ? error.details : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };
};

// Main error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  const isAppError = error instanceof AppError;
  
  // Log error with appropriate level
  if (!isAppError || !isAppError.isOperational) {
    // Log programming errors and unexpected errors with full stack trace
    logError(error, 'unhandled_error', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else if (isAppError.statusCode >= 500) {
    // Log server errors
    logError(error, 'server_error', {
      requestId: req.id,
      statusCode: isAppError.statusCode,
      code: isAppError.code,
    });
  } else {
    // Log client errors at debug level
    logger.debug('Client error', {
      error: error.message,
      statusCode: isAppError.statusCode,
      code: isAppError.code,
      requestId: req.id,
    });
  }

  // Determine status code
  let statusCode = 500;
  if (isAppError && isAppError.statusCode) {
    statusCode = isAppError.statusCode;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'CastError') {
    statusCode = 400;
  } else if (error.name === 'MongoError' || error.name === 'PostgresError') {
    statusCode = 503;
  }

  // Send error response
  const errorResponse = formatErrorResponse(
    isAppError ? error : new AppError('Internal server error'),
    req.id
  );

  res.status(statusCode).json(errorResponse);
};

// 404 handler for undefined routes
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
};

// Async error wrapper for route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Database error handler
export const handleDatabaseError = (error: any): AppError => {
  logger.debug('Database error details:', error);

  // PostgreSQL specific errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return new ConflictError('Resource already exists');
      case '23503': // Foreign key violation
        return new ValidationError('Referenced resource does not exist');
      case '23502': // Not null violation
        return new ValidationError('Required field is missing');
      case '42P01': // Undefined table
        return new DatabaseError('Database schema error');
      case '28P01': // Invalid password
      case '28000': // Invalid authorization
        return new DatabaseError('Database connection failed');
      default:
        return new DatabaseError('Database operation failed');
    }
  }

  // Connection errors
  if (error.message?.includes('connect') || error.code === 'ECONNREFUSED') {
    return new DatabaseError('Database connection failed');
  }

  // Timeout errors
  if (error.message?.includes('timeout') || error.code === 'ETIMEOUT') {
    return new DatabaseError('Database operation timed out');
  }

  // Generic database error
  return new DatabaseError('Database operation failed');
};

// Validation error handler for express-validator
export const handleValidationError = (errors: any[]): ValidationError => {
  const details = errors.map(error => ({
    field: error.param || error.path,
    message: error.msg || error.message,
    value: error.value,
  }));

  return new ValidationError('Validation failed', details);
};

// JWT error handler
export const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token expired');
  }
  
  if (error.name === 'NotBeforeError') {
    return new UnauthorizedError('Token not active');
  }

  return new UnauthorizedError('Authentication failed');
};

// Global unhandled rejection handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise,
  });
  
  // In production, we might want to restart the process
  if (config.isProduction) {
    logger.error('Shutting down due to unhandled rejection...');
    process.exit(1);
  }
});

// Global uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  
  logger.error('Shutting down due to uncaught exception...');
  process.exit(1);
});

// Graceful shutdown handler
export const setupGracefulShutdown = (server: any): void => {
  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Health check error response
export const createHealthCheckError = (
  message: string,
  details?: any
): {
  status: 'unhealthy';
  timestamp: string;
  error: string;
  details?: any;
} => {
  return {
    status: 'unhealthy',
    timestamp: new Date().toISOString(),
    error: message,
    details,
  };
};