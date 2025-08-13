/**
 * Configuration management routes
 * Handles equipment configurations, financial parameters, and exchange rates
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error';
import { 
  validateRequest,
  validationRules,
  apiRateLimit 
} from '@/middleware/security';
import { query } from 'express-validator';
import type { 
  EquipmentConfigResponse,
  FinancialParametersResponse,
  ExchangeRatesResponse,
  Currency,
  Region 
} from '@shared/types';

const router = Router();

// Apply rate limiting to all config routes
router.use(apiRateLimit);

/**
 * GET /api/v1/config/equipment
 * Retrieve equipment configurations with optional filtering
 */
router.get('/config/equipment', 
  validateRequest([
    query('category').optional().isIn(['air_cooling', 'immersion_cooling']),
    query('currency').optional().isIn(['USD', 'EUR', 'SAR', 'AED']),
    query('region').optional().isIn(['US', 'EU', 'ME']),
    query('effective_date').optional().isISO8601(),
    ...validationRules.pagination(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      category,
      currency = 'USD',
      region = 'US',
      effective_date,
      page = 1,
      limit = 50,
    } = req.query;

    // TODO: Implement actual database query
    // This is a placeholder response that matches the API specification
    const mockEquipmentData = [
      {
        id: 'eq_42u_standard_rack',
        category: 'air_cooling' as const,
        subcategory: 'rack' as const,
        item_code: '42U_STANDARD',
        display_name: {
          en: '42U Standard Server Rack',
          ar: 'رف خادم قياسي 42 وحدة'
        },
        specifications: {
          physical: {
            height_units: 42,
            width_mm: 600,
            depth_mm: 1000,
            weight_kg: 85
          },
          electrical: {
            power_capacity_kw: 15,
            power_consumption_kw: 0.5
          },
          thermal: {
            heat_dissipation_kw: 15,
            cooling_airflow_cfm: 500
          }
        },
        pricing: {
          USD: {
            equipment_cost: 2500,
            installation_cost: 1000,
            maintenance_annual_pct: 0.05
          },
          EUR: {
            equipment_cost: 2100,
            installation_cost: 840,
            maintenance_annual_pct: 0.05
          },
          SAR: {
            equipment_cost: 9375,
            installation_cost: 3750,
            maintenance_annual_pct: 0.05
          },
          AED: {
            equipment_cost: 9188,
            installation_cost: 3675,
            maintenance_annual_pct: 0.05
          }
        },
        effective_date: '2024-01-01T00:00:00Z',
        version: 1
      },
      {
        id: 'eq_immersion_tank_23u',
        category: 'immersion_cooling' as const,
        subcategory: 'tank' as const,
        item_code: 'IMMERSION_TANK_23U',
        display_name: {
          en: '23U Immersion Cooling Tank',
          ar: 'خزان التبريد بالغمر 23 وحدة'
        },
        specifications: {
          physical: {
            height_units: 23,
            server_capacity: 48,
            coolant_volume_liters: 500
          },
          thermal: {
            cooling_capacity_kw: 96,
            power_density_kw_per_u: 4.2
          },
          performance: {
            pue: 1.03,
            efficiency: 0.92
          }
        },
        pricing: {
          USD: {
            equipment_cost: 35000,
            installation_cost: 8000,
            maintenance_annual_pct: 0.03
          },
          EUR: {
            equipment_cost: 29400,
            installation_cost: 6720,
            maintenance_annual_pct: 0.03
          },
          SAR: {
            equipment_cost: 131250,
            installation_cost: 30000,
            maintenance_annual_pct: 0.03
          },
          AED: {
            equipment_cost: 128450,
            installation_cost: 29360,
            maintenance_annual_pct: 0.03
          }
        },
        effective_date: '2024-01-01T00:00:00Z',
        version: 1
      }
    ];

    // Filter by category if specified
    const filteredData = category 
      ? mockEquipmentData.filter(item => item.category === category)
      : mockEquipmentData;

    const response: EquipmentConfigResponse = {
      success: true,
      data: filteredData,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        currency: currency as Currency,
        region: region as Region,
      },
    };

    res.json(response);
  })
);

/**
 * GET /api/v1/config/financial
 * Retrieve financial parameters for calculations
 */
router.get('/config/financial',
  validateRequest([
    query('category').optional().isIn(['discount_rates', 'energy_costs', 'labor_costs', 'escalation_rates']),
    query('currency').optional().isIn(['USD', 'EUR', 'SAR', 'AED']),
    query('region').optional().isIn(['US', 'EU', 'ME']),
    ...validationRules.pagination(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      category,
      currency = 'USD',
      region = 'US',
    } = req.query;

    // TODO: Implement actual database query
    const mockFinancialData = [
      {
        parameter_code: 'corporate_discount_rate',
        parameter_name: 'Corporate Discount Rate',
        default_value: 0.08,
        currency_code: null,
        unit: 'decimal',
        regional_values: {
          US: { value: 0.08, unit: 'decimal' },
          EU: { value: 0.06, unit: 'decimal' },
          ME: { value: 0.10, unit: 'decimal' }
        },
        description: {
          en: 'Standard corporate discount rate for NPV calculations',
          ar: 'معدل الخصم الشركاتي القياسي لحسابات صافي القيمة الحالية'
        }
      },
      {
        parameter_code: 'energy_rate_industrial',
        parameter_name: 'Industrial Energy Rate',
        default_value: 0.12,
        currency_code: 'USD' as Currency,
        unit: 'per_kwh',
        regional_values: {
          US: { value: 0.12, unit: 'per_kwh' },
          EU: { value: 0.28, unit: 'per_kwh' },
          ME: { value: 0.08, unit: 'per_kwh' }
        },
        description: {
          en: 'Average industrial electricity rate',
          ar: 'متوسط سعر الكهرباء الصناعية'
        }
      },
      {
        parameter_code: 'energy_escalation_rate',
        parameter_name: 'Energy Cost Escalation Rate',
        default_value: 0.03,
        currency_code: null,
        unit: 'decimal',
        regional_values: {
          US: { value: 0.03, unit: 'decimal' },
          EU: { value: 0.025, unit: 'decimal' },
          ME: { value: 0.04, unit: 'decimal' }
        },
        description: {
          en: 'Annual energy cost escalation rate',
          ar: 'معدل تصاعد تكلفة الطاقة السنوي'
        }
      }
    ];

    const response: FinancialParametersResponse = {
      success: true,
      data: mockFinancialData,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        currency: currency as Currency,
        region: region as Region,
      },
    };

    res.json(response);
  })
);

/**
 * GET /api/v1/config/exchange-rates
 * Retrieve current exchange rates for supported currencies
 */
router.get('/config/exchange-rates',
  validateRequest([
    query('base_currency').optional().isIn(['USD', 'EUR', 'SAR', 'AED']),
    query('date').optional().isISO8601(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      base_currency = 'USD',
      date,
    } = req.query;

    // TODO: Implement actual database query and external API integration
    const mockExchangeRates = {
      USD: 1.0,
      EUR: 0.85,
      SAR: 3.75,
      AED: 3.67,
    };

    const response: ExchangeRatesResponse = {
      success: true,
      data: {
        base_currency: base_currency as Currency,
        effective_date: date as string || new Date().toISOString().split('T')[0],
        rates: mockExchangeRates,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    res.json(response);
  })
);

export default router;