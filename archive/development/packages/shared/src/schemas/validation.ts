/**
 * Zod validation schemas for all calculation and API interfaces
 * Provides comprehensive input validation with detailed error messages
 */

import { z } from 'zod';
import { VALIDATION_LIMITS, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES, SUPPORTED_REGIONS } from '../constants';

// Basic common schemas
export const CurrencySchema = z.enum(['USD', 'EUR', 'SAR', 'AED'] as const);
export const LocaleSchema = z.enum(['en', 'ar'] as const);
export const RegionSchema = z.enum(['US', 'EU', 'ME'] as const);

// Air cooling input schemas
export const AirCoolingInputMethodSchema = z.enum(['rack_count', 'total_power'] as const);

export const AirCoolingConfigSchema = z.object({
  input_method: AirCoolingInputMethodSchema,
  rack_count: z.number()
    .int()
    .min(VALIDATION_LIMITS.RACK_COUNT.MIN, `Rack count must be at least ${VALIDATION_LIMITS.RACK_COUNT.MIN}`)
    .max(VALIDATION_LIMITS.RACK_COUNT.MAX, `Rack count cannot exceed ${VALIDATION_LIMITS.RACK_COUNT.MAX}`)
    .optional(),
  rack_type: z.string().optional(),
  power_per_rack_kw: z.number()
    .min(VALIDATION_LIMITS.POWER_PER_RACK.MIN, `Power per rack must be at least ${VALIDATION_LIMITS.POWER_PER_RACK.MIN} kW`)
    .max(VALIDATION_LIMITS.POWER_PER_RACK.MAX, `Power per rack cannot exceed ${VALIDATION_LIMITS.POWER_PER_RACK.MAX} kW`)
    .optional(),
  total_power_kw: z.number()
    .min(VALIDATION_LIMITS.TOTAL_POWER.MIN, `Total power must be at least ${VALIDATION_LIMITS.TOTAL_POWER.MIN} kW`)
    .max(VALIDATION_LIMITS.TOTAL_POWER.MAX, `Total power cannot exceed ${VALIDATION_LIMITS.TOTAL_POWER.MAX} kW`)
    .optional(),
  hvac_efficiency: z.number()
    .min(0.1, 'HVAC efficiency must be at least 10%')
    .max(1.0, 'HVAC efficiency cannot exceed 100%')
    .optional(),
  power_distribution_efficiency: z.number()
    .min(0.1, 'Power distribution efficiency must be at least 10%')
    .max(1.0, 'Power distribution efficiency cannot exceed 100%')
    .optional(),
  space_efficiency: z.number()
    .min(0.1, 'Space efficiency must be at least 10%')
    .max(1.0, 'Space efficiency cannot exceed 100%')
    .optional(),
}).refine(data => {
  // Conditional validation based on input method
  if (data.input_method === 'rack_count') {
    return data.rack_count && data.power_per_rack_kw;
  } else if (data.input_method === 'total_power') {
    return data.total_power_kw;
  }
  return false;
}, {
  message: 'Required fields missing for selected input method',
});

// Immersion cooling schemas
export const ImmersionCoolingInputMethodSchema = z.enum(['manual_config', 'auto_optimize'] as const);

export const TankConfigurationSchema = z.object({
  size: z.string().regex(/^\d+U$/, 'Tank size must be in format like "23U"'),
  quantity: z.number()
    .int()
    .min(VALIDATION_LIMITS.TANK_QUANTITY.MIN, `Tank quantity must be at least ${VALIDATION_LIMITS.TANK_QUANTITY.MIN}`)
    .max(VALIDATION_LIMITS.TANK_QUANTITY.MAX, `Tank quantity cannot exceed ${VALIDATION_LIMITS.TANK_QUANTITY.MAX}`),
  power_density_kw_per_u: z.number()
    .min(VALIDATION_LIMITS.POWER_DENSITY.MIN, `Power density must be at least ${VALIDATION_LIMITS.POWER_DENSITY.MIN} kW per U`)
    .max(VALIDATION_LIMITS.POWER_DENSITY.MAX, `Power density cannot exceed ${VALIDATION_LIMITS.POWER_DENSITY.MAX} kW per U`),
});

export const ImmersionCoolingConfigSchema = z.object({
  input_method: ImmersionCoolingInputMethodSchema,
  target_power_kw: z.number()
    .min(VALIDATION_LIMITS.TOTAL_POWER.MIN, `Target power must be at least ${VALIDATION_LIMITS.TOTAL_POWER.MIN} kW`)
    .max(VALIDATION_LIMITS.TOTAL_POWER.MAX, `Target power cannot exceed ${VALIDATION_LIMITS.TOTAL_POWER.MAX} kW`)
    .optional(),
  tank_configurations: z.array(TankConfigurationSchema)
    .min(1, 'At least one tank configuration is required for manual config')
    .max(50, 'Cannot exceed 50 tank configurations')
    .optional(),
  coolant_type: z.string().optional(),
  pumping_efficiency: z.number()
    .min(0.1, 'Pumping efficiency must be at least 10%')
    .max(1.0, 'Pumping efficiency cannot exceed 100%')
    .optional(),
  heat_exchanger_efficiency: z.number()
    .min(0.1, 'Heat exchanger efficiency must be at least 10%')
    .max(1.0, 'Heat exchanger efficiency cannot exceed 100%')
    .optional(),
}).refine(data => {
  if (data.input_method === 'auto_optimize') {
    return data.target_power_kw;
  } else if (data.input_method === 'manual_config') {
    return data.tank_configurations && data.tank_configurations.length > 0;
  }
  return false;
}, {
  message: 'Required fields missing for selected input method',
});

// Financial configuration schema
export const FinancialConfigSchema = z.object({
  analysis_years: z.number()
    .int()
    .min(VALIDATION_LIMITS.ANALYSIS_YEARS.MIN, `Analysis years must be at least ${VALIDATION_LIMITS.ANALYSIS_YEARS.MIN}`)
    .max(VALIDATION_LIMITS.ANALYSIS_YEARS.MAX, `Analysis years cannot exceed ${VALIDATION_LIMITS.ANALYSIS_YEARS.MAX}`),
  discount_rate: z.number()
    .min(VALIDATION_LIMITS.DISCOUNT_RATE.MIN, `Discount rate must be at least ${VALIDATION_LIMITS.DISCOUNT_RATE.MIN * 100}%`)
    .max(VALIDATION_LIMITS.DISCOUNT_RATE.MAX, `Discount rate cannot exceed ${VALIDATION_LIMITS.DISCOUNT_RATE.MAX * 100}%`)
    .optional(),
  energy_cost_kwh: z.number()
    .min(VALIDATION_LIMITS.ENERGY_COST.MIN, `Energy cost must be at least $${VALIDATION_LIMITS.ENERGY_COST.MIN} per kWh`)
    .max(VALIDATION_LIMITS.ENERGY_COST.MAX, `Energy cost cannot exceed $${VALIDATION_LIMITS.ENERGY_COST.MAX} per kWh`)
    .optional(),
  energy_escalation_rate: z.number()
    .min(-0.1, 'Energy escalation rate cannot be less than -10%')
    .max(0.2, 'Energy escalation rate cannot exceed 20%')
    .optional(),
  maintenance_escalation_rate: z.number()
    .min(-0.1, 'Maintenance escalation rate cannot be less than -10%')
    .max(0.2, 'Maintenance escalation rate cannot exceed 20%')
    .optional(),
  currency: CurrencySchema,
  region: RegionSchema.optional(),
  custom_discount_rate: z.number()
    .min(VALIDATION_LIMITS.DISCOUNT_RATE.MIN)
    .max(VALIDATION_LIMITS.DISCOUNT_RATE.MAX)
    .optional(),
  custom_energy_cost: z.number()
    .min(VALIDATION_LIMITS.ENERGY_COST.MIN)
    .max(VALIDATION_LIMITS.ENERGY_COST.MAX)
    .optional(),
  custom_labor_cost: z.number()
    .min(10, 'Custom labor cost must be at least $10 per hour')
    .max(200, 'Custom labor cost cannot exceed $200 per hour')
    .optional(),
});

// Main calculation configuration schema
export const CalculationConfigurationSchema = z.object({
  air_cooling: AirCoolingConfigSchema,
  immersion_cooling: ImmersionCoolingConfigSchema,
  financial: FinancialConfigSchema,
});

// Calculation request schema
export const CalculationRequestSchema = z.object({
  configuration: CalculationConfigurationSchema,
  locale: LocaleSchema.optional(),
  save_session: z.boolean().optional(),
  session_expiry_days: z.number()
    .int()
    .min(1, 'Session expiry must be at least 1 day')
    .max(365, 'Session expiry cannot exceed 365 days')
    .optional(),
});

// Validation result schemas
export const ValidationWarningSchema = z.object({
  field: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const ValidationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    valid: z.boolean(),
    warnings: z.array(ValidationWarningSchema),
    estimated_processing_time: z.number().optional(),
  }),
});

// Cost breakdown schemas for validation
export const CostBreakdownSchema = z.object({
  equipment: z.number().min(0),
  installation: z.number().min(0),
  infrastructure: z.number().min(0),
  energy: z.number().min(0).optional(),
  maintenance: z.number().min(0).optional(),
  coolant: z.number().min(0).optional(),
  labor: z.number().min(0).optional(),
  total: z.number().min(0),
});

// PUE analysis schema
export const PUEAnalysisSchema = z.object({
  air_cooling: z.number().min(1.0, 'Air cooling PUE cannot be less than 1.0'),
  immersion_cooling: z.number().min(1.0, 'Immersion cooling PUE cannot be less than 1.0'),
  improvement_percent: z.number(),
  energy_savings_kwh_annual: z.number(),
});

// Environmental impact schema
export const EnvironmentalImpactSchema = z.object({
  carbon_savings_kg_co2_annual: z.number(),
  water_savings_gallons_annual: z.number(),
  energy_savings_kwh_annual: z.number(),
  carbon_footprint_reduction_percent: z.number(),
});

// Calculation results schema for output validation
export const CalculationResultsSchema = z.object({
  summary: z.object({
    total_capex_savings: z.number(),
    total_opex_savings_5yr: z.number(),
    total_tco_savings_5yr: z.number(),
    roi_percent: z.number(),
    payback_months: z.number(),
    npv_savings: z.number(),
    irr_percent: z.number().optional(),
    pue_air_cooling: z.number().min(1.0),
    pue_immersion_cooling: z.number().min(1.0),
    energy_efficiency_improvement: z.number(),
    cost_per_kw_air_cooling: z.number().min(0),
    cost_per_kw_immersion_cooling: z.number().min(0),
    cost_per_rack_equivalent: z.number().min(0),
  }),
  breakdown: z.object({
    capex: z.object({
      air_cooling: CostBreakdownSchema,
      immersion_cooling: CostBreakdownSchema,
      savings: z.number(),
      savings_percent: z.number(),
    }),
    opex_annual: z.array(z.object({
      year: z.number().int().min(1),
      air_cooling: CostBreakdownSchema,
      immersion_cooling: CostBreakdownSchema,
      savings: z.number(),
      savings_percent: z.number(),
    })),
    tco_cumulative: z.array(z.object({
      year: z.number().int().min(1),
      air_cooling: z.number().min(0),
      immersion_cooling: z.number().min(0),
      savings: z.number(),
      npv_savings: z.number(),
    })),
    maintenance_schedule: z.array(z.object({
      year: z.number().int().min(1),
      air_cooling_maintenance: z.number().min(0),
      immersion_cooling_maintenance: z.number().min(0),
      major_overhauls: z.number().min(0),
    })),
  }),
  charts: z.object({
    tco_progression: z.array(z.object({
      year: z.number().int(),
      air_cooling: z.number(),
      immersion_cooling: z.number(),
      savings: z.number(),
      cumulative_savings: z.number(),
    })),
    pue_comparison: z.object({
      air_cooling: z.number(),
      immersion_cooling: z.number(),
    }),
    cost_categories: z.record(z.object({
      air_cooling: z.number(),
      immersion_cooling: z.number(),
      difference: z.number(),
    })),
    sensitivity_analysis: z.array(z.object({
      parameter: z.string(),
      scenarios: z.array(z.object({
        value: z.number(),
        tco_savings: z.number(),
        roi_percent: z.number(),
      })),
    })).optional(),
  }),
  environmental: EnvironmentalImpactSchema,
  pue_analysis: PUEAnalysisSchema,
  calculation_id: z.string().optional(),
  session_id: z.string().optional(),
  calculated_at: z.string(),
  calculation_version: z.string(),
  configuration_hash: z.string(),
});

// Report generation schemas
export const ReportConfigSchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv']),
  include_charts: z.boolean().default(true),
  include_details: z.boolean().default(true),
  include_methodology: z.boolean().default(false),
  branding: z.object({
    company_name: z.string().optional(),
    company_logo: z.string().url().optional(),
    primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  }).optional(),
  locale: LocaleSchema.default('en'),
  currency: CurrencySchema.default('USD'),
});

export const ReportRequestSchema = z.object({
  session_id: z.string(),
  calculation_id: z.string().optional(),
  config: ReportConfigSchema.default({}),
});

// Sharing schemas
export const ShareConfigSchema = z.object({
  expires_at: z.string().datetime().optional(),
  access_level: z.enum(['view', 'copy']).default('view'),
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
});

export const ShareRequestSchema = z.object({
  session_id: z.string(),
  calculation_id: z.string().optional(),
  config: ShareConfigSchema.default({}),
});

// Admin configuration schemas
export const EquipmentCostConfigSchema = z.object({
  air_cooling: z.object({
    rack_42u_cost: z.number().min(0),
    rack_installation_cost: z.number().min(0),
    hvac_30kw_cost: z.number().min(0),
    hvac_installation_cost: z.number().min(0),
    infrastructure_cost_per_kw: z.number().min(0),
  }),
  immersion_cooling: z.object({
    tank_23u_base_cost: z.number().min(0),
    tank_installation_multiplier: z.number().min(0).max(1),
    coolant_cost_per_liter: z.number().min(0),
    pump_system_cost: z.number().min(0),
    heat_exchanger_cost: z.number().min(0),
    infrastructure_cost_per_kw: z.number().min(0),
  }),
});

export const RegionalConfigSchema = z.object({
  energy_costs: z.object({
    US: z.number().min(0),
    EU: z.number().min(0),
    ME: z.number().min(0),
  }),
  labor_costs: z.object({
    US: z.number().min(0),
    EU: z.number().min(0),
    ME: z.number().min(0),
  }),
  carbon_factors: z.object({
    US: z.number().min(0),
    EU: z.number().min(0),
    ME: z.number().min(0),
  }),
});

export const AdminConfigUpdateSchema = z.object({
  equipment_costs: EquipmentCostConfigSchema.optional(),
  regional_config: RegionalConfigSchema.optional(),
  financial_defaults: z.object({
    discount_rate: z.number().min(0).max(1),
    energy_escalation_rate: z.number().min(-0.1).max(0.5),
    maintenance_escalation_rate: z.number().min(-0.1).max(0.5),
  }).optional(),
});

/**
 * Validation utility functions
 */
export const ValidationUtils = {
  /**
   * Validate calculation configuration with detailed error reporting
   */
  validateCalculationConfig(data: unknown): { 
    success: boolean; 
    data?: any; 
    errors: string[]; 
  } {
    const result = CalculationConfigurationSchema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data, errors: [] };
    }
    
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
    
    return { success: false, errors };
  },

  /**
   * Validate and sanitize calculation request
   */
  validateCalculationRequest(data: unknown): {
    success: boolean;
    data?: any;
    errors: string[];
  } {
    const result = CalculationRequestSchema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data, errors: [] };
    }
    
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
    
    return { success: false, errors };
  },

  /**
   * Validate calculation results before sending to client
   */
  validateCalculationResults(data: unknown): {
    success: boolean;
    data?: any;
    errors: string[];
  } {
    const result = CalculationResultsSchema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data, errors: [] };
    }
    
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
    
    return { success: false, errors };
  },

  /**
   * Extract validation warnings from configuration
   */
  extractValidationWarnings(config: any): Array<{ field: string; message: string; suggestion?: string }> {
    const warnings = [];
    
    // Check for potentially unrealistic values
    if (config.air_cooling?.power_per_rack_kw && config.air_cooling.power_per_rack_kw > 30) {
      warnings.push({
        field: 'air_cooling.power_per_rack_kw',
        message: 'Power per rack is very high',
        suggestion: 'Consider if this value is realistic for your equipment',
      });
    }
    
    if (config.financial?.discount_rate && config.financial.discount_rate > 0.15) {
      warnings.push({
        field: 'financial.discount_rate',
        message: 'Discount rate is very high',
        suggestion: 'High discount rates may undervalue long-term savings',
      });
    }
    
    if (config.immersion_cooling?.tank_configurations?.length > 10) {
      warnings.push({
        field: 'immersion_cooling.tank_configurations',
        message: 'Many tank configurations specified',
        suggestion: 'Consider using auto-optimize for simpler configuration',
      });
    }
    
    return warnings;
  },

  /**
   * Estimate processing complexity score
   */
  calculateComplexityScore(config: any): number {
    let score = 1;
    
    // Add complexity for analysis years
    score += config.financial?.analysis_years || 5;
    
    // Add complexity for manual tank configurations
    if (config.immersion_cooling?.tank_configurations) {
      score += config.immersion_cooling.tank_configurations.length * 2;
    }
    
    // Add complexity for large installations
    if (config.air_cooling?.rack_count > 100) {
      score += 10;
    }
    
    return Math.min(score, 100); // Cap at 100
  },
};

// Export all schemas for external use
export {
  CalculationConfigurationSchema as ConfigSchema,
  CalculationRequestSchema as RequestSchema,
  CalculationResultsSchema as ResultsSchema,
};