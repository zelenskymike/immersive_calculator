/**
 * Main application server
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { config, validateProductionConfig } from '@/config/environment';
import { initializeConnections } from '@/config/database';
import { 
  logger, 
  logRequest, 
  addRequestId,
  createContextLogger 
} from '@/utils/logger';
import {
  securityHeaders,
  corsOptions,
  validateContentType,
  limitRequestSize,
} from '@/middleware/security';
import {
  errorHandler,
  notFoundHandler,
  setupGracefulShutdown,
} from '@/middleware/error';

// Import routes
import healthRoutes from '@/routes/health';
import configRoutes from '@/routes/config';
import calculationRoutes from '@/routes/calculations';
import reportRoutes from '@/routes/reports';
import sharingRoutes from '@/routes/sharing';
// import adminRoutes from '@/routes/admin';

const serverLogger = createContextLogger('server');

/**
 * Create Express application with middleware and routes
 */
function createApp(): express.Application {
  const app = express();

  // Trust proxy (important for getting real IP addresses behind load balancers)
  app.set('trust proxy', config.isProduction);

  // Add request ID to all requests
  app.use(addRequestId);

  // Security middleware
  app.use(securityHeaders);
  app.use(cors(corsOptions));

  // Request parsing middleware
  app.use(compression());
  app.use(express.json({ 
    limit: '1mb',
    strict: true,
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb' 
  }));

  // Content-Type validation for API routes
  app.use('/api', validateContentType(['application/json']));
  
  // Request size limiting
  app.use(limitRequestSize(1024 * 1024)); // 1MB limit

  // Request logging
  if (config.isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(logRequest);
  }

  // API version prefix
  const apiV1 = '/api/v1';

  // Health check routes (no rate limiting for monitoring)
  app.use(healthRoutes);

  // Main API routes
  app.use(apiV1, configRoutes);
  app.use(apiV1, calculationRoutes);
  app.use(apiV1, reportRoutes);
  app.use(apiV1, sharingRoutes);
  // app.use(apiV1, adminRoutes);

  // Catch-all for undefined routes
  app.use('*', notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Validate environment configuration
    if (config.isProduction) {
      validateProductionConfig();
    }

    serverLogger.info('Starting TCO Calculator API server...', {
      environment: config.nodeEnv,
      port: config.server.port,
      host: config.server.host,
    });

    // Initialize database connections
    await initializeConnections();
    
    // Create Express application
    const app = createApp();

    // Start HTTP server
    const server = app.listen(config.server.port, config.server.host, () => {
      serverLogger.info('Server started successfully', {
        port: config.server.port,
        host: config.server.host,
        environment: config.nodeEnv,
        processId: process.pid,
      });

      // Log startup summary
      serverLogger.info('Application configuration', {
        database: {
          host: config.database.host,
          port: config.database.port,
          name: config.database.name,
        },
        redis: {
          url: config.redis.url.replace(/:\/\/.*@/, '://***:***@'), // Hide credentials
        },
        security: {
          rateLimit: config.rateLimit.maxRequests,
          corsOrigins: config.server.corsOrigins,
        },
        features: {
          metrics: config.metrics.enabled,
          swagger: config.development.enableSwagger,
          debugRoutes: config.development.enableDebugRoutes,
        },
      });
    });

    // Configure server timeouts
    server.timeout = 30000; // 30 seconds
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds

    // Setup graceful shutdown
    setupGracefulShutdown(server);

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        serverLogger.error(`Port ${config.server.port} is already in use`);
        process.exit(1);
      } else {
        serverLogger.error('Server error:', error);
        process.exit(1);
      }
    });

    // Handle client connection errors
    server.on('clientError', (err: Error, socket: any) => {
      serverLogger.warn('Client connection error:', {
        error: err.message,
        remoteAddress: socket.remoteAddress,
      });
      
      if (socket.writable) {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      }
    });

    // Log when server is ready to accept connections
    process.nextTick(() => {
      serverLogger.info('Server is ready to accept connections');
    });

  } catch (error) {
    serverLogger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Shutdown handler for cleanup
 */
async function shutdown(): Promise<void> {
  serverLogger.info('Initiating shutdown sequence...');
  
  try {
    // Close database connections
    const { db, redis } = await import('@/config/database');
    await Promise.all([
      db.close(),
      redis.close(),
    ]);
    
    serverLogger.info('All connections closed successfully');
  } catch (error) {
    serverLogger.error('Error during shutdown:', error);
  }
}

// Register shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export { createApp, startServer };
export default createApp;