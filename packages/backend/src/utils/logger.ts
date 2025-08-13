/**
 * Centralized logging configuration using Winston
 */

import winston from 'winston';
import { config } from '@/config/environment';

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logColors = {
  error: 'red',
  warn: 'yellow', 
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

// Custom log formats
const jsonFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logObject = {
      timestamp,
      level,
      message,
      service: 'tco-calculator-api',
      environment: config.nodeEnv,
      ...meta,
    };

    // Remove empty metadata
    Object.keys(logObject).forEach(key => {
      if (logObject[key] === undefined || logObject[key] === null) {
        delete logObject[key];
      }
    });

    return JSON.stringify(logObject);
  })
);

const simpleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

const combinedFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}`;
  })
);

// Determine format based on configuration
let logFormat: winston.Logform.Format;
switch (config.logging.format) {
  case 'json':
    logFormat = jsonFormat;
    break;
  case 'simple':
    logFormat = simpleFormat;
    break;
  case 'combined':
    logFormat = combinedFormat;
    break;
  default:
    logFormat = config.isDevelopment ? simpleFormat : jsonFormat;
}

// Create transports array
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: config.logging.level,
    format: logFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
];

// File transports for non-development environments
if (!config.isDevelopment) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: config.logging.level,
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test',
});

// Create specialized loggers for different contexts
export const createContextLogger = (context: string) => {
  return {
    error: (message: string, meta?: any) => logger.error(message, { context, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { context, ...meta }),
    info: (message: string, meta?: any) => logger.info(message, { context, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { context, ...meta }),
  };
};

// Request logging helper
export const logRequest = (req: any, res: any, next: any): void => {
  const start = Date.now();
  
  // Log request start
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      requestId: req.id,
      contentLength: res.get('Content-Length') || 0,
    });

    originalEnd.call(res, chunk, encoding);
  };

  next();
};

// Error logging helper
export const logError = (error: Error, context?: string, additionalMeta?: any): void => {
  logger.error('Application error', {
    context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...additionalMeta,
  });
};

// Database query logging helper  
export const logDatabaseQuery = (query: string, params?: any[], duration?: number): void => {
  logger.debug('Database query executed', {
    query: query.substring(0, 200), // Truncate long queries
    paramCount: params?.length || 0,
    duration,
  });
};

// Performance logging helper
export const logPerformance = (operation: string, duration: number, meta?: any): void => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, 'Performance metric', {
    operation,
    duration,
    ...meta,
  });
};

// Security event logging
export const logSecurityEvent = (
  event: string,
  level: 'info' | 'warn' | 'error',
  details: any
): void => {
  logger.log(level, `Security event: ${event}`, {
    securityEvent: true,
    event,
    ...details,
  });
};

// Audit logging for configuration changes
export const logAuditEvent = (
  action: string,
  resource: string,
  user: string,
  changes?: any
): void => {
  logger.info('Audit event', {
    audit: true,
    action,
    resource,
    user,
    changes,
    timestamp: new Date().toISOString(),
  });
};

// Business logic logging
export const logBusinessEvent = (
  event: string,
  data: any,
  userId?: string
): void => {
  logger.info('Business event', {
    businessEvent: true,
    event,
    data,
    userId,
  });
};

// Calculation logging
export const logCalculation = (
  sessionId: string,
  calculationType: string,
  duration: number,
  meta?: any
): void => {
  logger.info('Calculation completed', {
    calculation: true,
    sessionId,
    calculationType,
    duration,
    ...meta,
  });
};

// Report generation logging
export const logReportGeneration = (
  reportId: string,
  reportType: string,
  status: 'started' | 'completed' | 'failed',
  duration?: number,
  error?: string
): void => {
  const level = status === 'failed' ? 'error' : 'info';
  
  logger.log(level, `Report generation ${status}`, {
    report: true,
    reportId,
    reportType,
    status,
    duration,
    error,
  });
};

// Create middleware for Express request ID generation
export const addRequestId = (req: any, res: any, next: any): void => {
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Export logger instance as default
export default logger;