/**
 * Health check and system status routes
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error';
import { checkConnectionsHealth } from '@/config/database';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Basic health check endpoint
 * Returns 200 if the service is running
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'tco-calculator-api',
    version: '1.0.0',
  });
}));

/**
 * Detailed health check with dependency status
 * Checks database and Redis connections
 */
router.get('/health/detailed', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check all connections
    const connectionHealth = await checkConnectionsHealth();
    
    const isHealthy = connectionHealth.database.status === 'pass' && 
                     connectionHealth.redis.status === 'pass';
    
    const overallStatus = isHealthy ? 'healthy' : 'unhealthy';
    const statusCode = isHealthy ? 200 : 503;
    
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'tco-calculator-api',
      version: '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      checks: {
        database: connectionHealth.database,
        redis: connectionHealth.redis,
        memory: {
          status: 'pass',
          usage: process.memoryUsage(),
        },
        cpu: {
          status: 'pass',
          load: process.cpuUsage(),
        },
      },
      response_time_ms: Date.now() - startTime,
    };

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'tco-calculator-api',
      error: 'Health check failed',
      response_time_ms: Date.now() - startTime,
    });
  }
}));

/**
 * Readiness probe for Kubernetes
 * Returns 200 when service is ready to accept traffic
 */
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  try {
    const connectionHealth = await checkConnectionsHealth();
    
    const isReady = connectionHealth.database.status === 'pass' && 
                   connectionHealth.redis.status === 'pass';
    
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: connectionHealth.database.status,
          redis: connectionHealth.redis.status,
        },
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: connectionHealth.database.status,
          redis: connectionHealth.redis.status,
        },
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
}));

/**
 * Liveness probe for Kubernetes
 * Returns 200 if the process is alive
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
  });
});

/**
 * API information endpoint
 * Returns basic API metadata
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    name: 'TCO Calculator API',
    version: '1.0.0',
    description: 'RESTful API for Total Cost of Ownership calculations comparing air cooling and immersion cooling systems',
    environment: config.nodeEnv,
    build: {
      timestamp: new Date().toISOString(),
      node_version: process.version,
    },
    features: {
      multi_currency: true,
      multi_language: true,
      pdf_reports: true,
      excel_reports: true,
      sharing: true,
      admin_interface: true,
    },
    supported: {
      currencies: ['USD', 'EUR', 'SAR', 'AED'],
      locales: ['en', 'ar'],
      calculation_years: `1-${config.business.maxCalculationYears}`,
      max_racks: config.business.maxRackCount,
    },
    limits: {
      rate_limit: config.rateLimit.maxRequests,
      max_file_size_mb: config.storage.maxFileSizeMb,
      session_timeout_hours: config.sessions.timeoutHours,
    },
  });
});

export default router;