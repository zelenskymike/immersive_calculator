/**
 * Calculation processing routes
 * Handles TCO calculations, validation, and session management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '@/middleware/error';
import { 
  validateRequest,
  validationRules,
  calculationRateLimit 
} from '@/middleware/security';
import { logger, logCalculation } from '@/utils/logger';
import type { 
  CalculationRequest,
  CalculationResponse,
  ValidationResponse,
  CalculationResults,
  CalculationSummary,
  Currency,
  Locale 
} from '@shared/types';
import { 
  calculateTCO, 
  CalculationUtils,
  ValidationSchemas 
} from '@tco-calculator/shared';

const router = Router();

// Apply calculation-specific rate limiting
router.use('/calculations', calculationRateLimit);

/**
 * POST /api/v1/calculations/validate
 * Validate calculation parameters without performing full calculation
 */
router.post('/calculations/validate',
  validateRequest([
    ...validationRules.calculationConfig(),
    validationRules.locale(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { configuration, locale = 'en' } = req.body;

    // Validate using Zod schema
    const validationResult = ValidationSchemas.CalculationConfiguration.safeParse(configuration);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid configuration parameters',
          details: validationResult.error.errors,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.id,
        },
      });
    }

    // Perform business logic validation using shared utilities
    const businessValidation = CalculationUtils.validateConfiguration(configuration);
    const warnings: any[] = [];

    if (!businessValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIGURATION',
          message: businessValidation.errors.join('; '),
          details: businessValidation.errors,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.id,
        },
      });
    }

    // Check for performance warnings
    if (configuration.air_cooling.rack_count > 500) {
      warnings.push({
        field: 'air_cooling.rack_count',
        message: 'High rack count may result in less accurate estimates',
        suggestion: 'Consider breaking down into smaller deployments'
      });
    }

    if (configuration.financial.analysis_years > 7) {
      warnings.push({
        field: 'financial.analysis_years',
        message: 'Long-term projections have higher uncertainty',
        suggestion: 'Consider focusing on 3-7 year analysis periods'
      });
    }

    // Estimate processing time using shared utilities
    const estimatedProcessingTime = CalculationUtils.estimateProcessingTime(configuration);

    const response: ValidationResponse = {
      success: true,
      data: {
        valid: true,
        warnings,
        estimated_processing_time: estimatedProcessingTime,
      },
    };

    res.json(response);
  })
);

/**
 * POST /api/v1/calculations/calculate
 * Perform complete TCO analysis calculation
 */
router.post('/calculations/calculate',
  validateRequest([
    ...validationRules.calculationConfig(),
    validationRules.locale(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const calculationId = uuidv4();
    
    const {
      configuration,
      locale = 'en',
      save_session = false,
      session_expiry_days = 30,
    } = req.body as CalculationRequest;

    logger.info('Calculation started', {
      calculationId,
      currency: configuration.financial.currency,
      locale,
      airCoolingRacks: configuration.air_cooling.rack_count,
      analysisYears: configuration.financial.analysis_years,
    });

    try {
      // Validate configuration using shared utilities
      const businessValidation = CalculationUtils.validateConfiguration(configuration);
      if (!businessValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONFIGURATION',
            message: businessValidation.errors.join('; '),
            details: businessValidation.errors,
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.id,
          },
        });
      }

      // Perform TCO calculation using the shared calculation engine
      const results = calculateTCO(configuration);
      
      const processingTime = Date.now() - startTime;
      
      // Log successful calculation
      logCalculation(calculationId, 'standard_tco', processingTime, {
        currency: configuration.financial.currency,
        totalSavings: results.summary.total_tco_savings_5yr,
        roiPercent: results.summary.roi_percent,
      });

      const response: CalculationResponse = {
        success: true,
        data: results,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          locale: locale as Locale,
          currency: configuration.financial.currency,
          processing_time_ms: processingTime,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Calculation failed', {
        calculationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      });
      throw error;
    }
  })
);

/**
 * GET /api/v1/calculations/:sessionId
 * Retrieve saved calculation session
 */
router.get('/calculations/:sessionId',
  validateRequest([
    validationRules.uuid('sessionId'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    // TODO: Implement session retrieval from database
    logger.info('Session retrieval requested', { sessionId });

    // For now, return a mock response
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Calculation session not found or expired',
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
      },
    });
  })
);


export default router;