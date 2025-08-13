/**
 * Sharing and link management routes
 * Handles shareable calculation links and session management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { asyncHandler } from '@/middleware/error';
import { 
  validateRequest,
  validationRules,
  apiRateLimit 
} from '@/middleware/security';
import { logger } from '@/utils/logger';
import type { 
  ShareLinkRequest,
  ShareLinkResponse,
  SharedCalculationResponse,
  CalculationSession 
} from '@shared/types';

const router = Router();

// Apply rate limiting to sharing routes
router.use('/share', apiRateLimit);

/**
 * POST /api/v1/share/create
 * Create a shareable link for calculation results
 */
router.post('/share/create',
  validateRequest([
    validationRules.uuid('session_id', 'body'),
    validationRules.shareExpiry(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      session_id,
      expiry_days = 30,
      is_public = false,
      description,
    } = req.body as ShareLinkRequest;

    // Generate secure sharing token
    const shareToken = randomBytes(32).toString('hex');
    const shareId = uuidv4();

    logger.info('Share link creation requested', {
      shareId,
      sessionId: session_id,
      expiryDays: expiry_days,
      isPublic: is_public,
      ipAddress: req.ip,
    });

    try {
      // TODO: Implement actual database operations
      // This would involve:
      // 1. Verify session exists and belongs to user (if authenticated)
      // 2. Create share record in database
      // 3. Update session with sharing metadata
      // 4. Return share link details

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiry_days);

      // Mock share link creation
      const shareLink = {
        id: shareId,
        session_id,
        share_token: shareToken,
        share_url: `${req.protocol}://${req.get('host')}/share/${shareToken}`,
        is_public,
        description,
        expires_at: expiresAt.toISOString(),
        access_count: 0,
        created_at: new Date().toISOString(),
      };

      const response: ShareLinkResponse = {
        success: true,
        data: shareLink,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      res.json(response);

    } catch (error) {
      logger.error('Share link creation failed', {
        shareId,
        sessionId: session_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  })
);

/**
 * GET /api/v1/share/:shareToken
 * Access a shared calculation via share token
 */
router.get('/share/:shareToken',
  validateRequest([
    validationRules.shareToken('shareToken'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { shareToken } = req.params;

    logger.info('Shared calculation access', {
      shareToken: shareToken.slice(0, 8) + '...',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    try {
      // TODO: Implement actual database query
      // This would involve:
      // 1. Look up share record by token
      // 2. Verify link is not expired
      // 3. Increment access counter
      // 4. Retrieve associated calculation session
      // 5. Return calculation data (read-only)

      // Mock shared calculation data
      const mockSharedCalculation: CalculationSession = {
        id: uuidv4(),
        session_token: shareToken,
        configuration: {
          air_cooling: {
            input_method: 'rack_count',
            rack_count: 100,
            power_per_rack_kw: 12,
          },
          immersion_cooling: {
            input_method: 'auto_optimize',
            target_power_kw: 1200,
          },
          financial: {
            analysis_years: 5,
            currency: 'USD',
            discount_rate: 0.08,
          },
        },
        results: {
          summary: {
            total_capex_savings: -125000,
            total_opex_savings_5yr: 450000,
            total_tco_savings_5yr: 325000,
            roi_percent: 18.5,
            payback_months: 24,
            npv_savings: 285000,
            pue_air_cooling: 1.4,
            pue_immersion_cooling: 1.03,
            energy_efficiency_improvement: 26.4,
            cost_per_kw_air_cooling: 850,
            cost_per_kw_immersion_cooling: 950,
            cost_per_rack_equivalent: 11400,
          },
          breakdown: {
            capex: {
              air_cooling: {
                equipment: 750000,
                installation: 150000,
                infrastructure: 120000,
                total: 1020000,
              },
              immersion_cooling: {
                equipment: 980000,
                installation: 120000,
                infrastructure: 45000,
                total: 1145000,
              },
              savings: -125000,
              savings_percent: -12.3,
            },
            opex_annual: [],
            tco_cumulative: [],
            maintenance_schedule: [],
          },
          charts: {
            tco_progression: [],
            pue_comparison: {
              air_cooling: 1.4,
              immersion_cooling: 1.03,
            },
            cost_categories: {},
          },
          environmental: {
            carbon_savings_kg_co2_annual: 75000,
            water_savings_gallons_annual: 125000,
            energy_savings_kwh_annual: 180000,
            carbon_footprint_reduction_percent: 26.4,
          },
          pue_analysis: {
            air_cooling: 1.4,
            immersion_cooling: 1.03,
            improvement_percent: 26.4,
            energy_savings_kwh_annual: 180000,
          },
          calculation_id: uuidv4(),
          calculated_at: new Date(Date.now() - 3600000).toISOString(),
          calculation_version: '1.0.0',
          configuration_hash: 'mock_hash_123',
        },
        locale: 'en',
        currency: 'USD',
        last_accessed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        access_count: 1,
        is_public: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response: SharedCalculationResponse = {
        success: true,
        data: mockSharedCalculation,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          shared: true,
          read_only: true,
        },
      };

      res.json(response);

    } catch (error) {
      logger.error('Shared calculation access failed', {
        shareToken: shareToken.slice(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return not found for security (don't leak existence of invalid tokens)
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Shared calculation not found or expired',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.id,
        },
      });
    }
  })
);

/**
 * GET /api/v1/share/:shareToken/info
 * Get metadata about a shared link without accessing the calculation
 */
router.get('/share/:shareToken/info',
  validateRequest([
    validationRules.shareToken('shareToken'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { shareToken } = req.params;

    logger.info('Share link info requested', {
      shareToken: shareToken.slice(0, 8) + '...',
      ipAddress: req.ip,
    });

    // TODO: Implement actual database query
    const mockShareInfo = {
      id: uuidv4(),
      is_public: false,
      description: 'Data Center TCO Analysis - 100 Racks',
      expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      access_count: 5,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      calculation_summary: {
        currency: 'USD',
        analysis_years: 5,
        total_savings: 325000,
        roi_percent: 18.5,
      },
    };

    res.json({
      success: true,
      data: mockShareInfo,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  })
);

/**
 * PUT /api/v1/share/:shareToken/settings
 * Update sharing settings (description, expiry, etc.)
 */
router.put('/share/:shareToken/settings',
  validateRequest([
    validationRules.shareToken('shareToken'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { shareToken } = req.params;
    const {
      description,
      expiry_days,
      is_public,
    } = req.body;

    logger.info('Share settings update', {
      shareToken: shareToken.slice(0, 8) + '...',
      ipAddress: req.ip,
    });

    // TODO: Implement actual database update
    // This would involve:
    // 1. Verify ownership (if authentication is implemented)
    // 2. Update share record
    // 3. Return updated settings

    const updatedSettings = {
      id: uuidv4(),
      description: description || 'Updated TCO Analysis',
      is_public: is_public ?? false,
      expires_at: expiry_days ? 
        new Date(Date.now() + expiry_days * 24 * 60 * 60 * 1000).toISOString() :
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: updatedSettings,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  })
);

/**
 * DELETE /api/v1/share/:shareToken
 * Revoke a shared link
 */
router.delete('/share/:shareToken',
  validateRequest([
    validationRules.shareToken('shareToken'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { shareToken } = req.params;

    logger.info('Share link revocation', {
      shareToken: shareToken.slice(0, 8) + '...',
      ipAddress: req.ip,
    });

    // TODO: Implement actual database deletion
    // This would involve:
    // 1. Verify ownership (if authentication is implemented)
    // 2. Mark share record as revoked or delete it
    // 3. Update session sharing status

    res.json({
      success: true,
      data: {
        revoked: true,
        revoked_at: new Date().toISOString(),
        share_token: shareToken.slice(0, 8) + '...',
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  })
);

/**
 * GET /api/v1/share/public
 * List publicly shared calculations (if feature is enabled)
 */
router.get('/share/public',
  validateRequest([
    ...validationRules.pagination(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;

    logger.info('Public shares list requested', {
      page,
      limit,
      ipAddress: req.ip,
    });

    // TODO: Implement actual database query for public shares
    const mockPublicShares: any[] = [];

    res.json({
      success: true,
      data: mockPublicShares,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 0,
        pages: 0,
        has_next: false,
        has_prev: false,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  })
);

export default router;