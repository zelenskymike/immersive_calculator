/**
 * Calculation and financial analysis types
 */

import type { BaseEntity, Currency, Locale, Region } from './common';

// Input method types
export type AirCoolingInputMethod = 'rack_count' | 'total_power';
export type ImmersionCoolingInputMethod = 'manual_config' | 'auto_optimize';

// Air cooling configuration
export interface AirCoolingConfig {
  input_method: AirCoolingInputMethod;
  
  // Direct rack configuration
  rack_count?: number;
  rack_type?: string;
  power_per_rack_kw?: number;
  
  // Total power configuration
  total_power_kw?: number;
  
  // Efficiency parameters
  hvac_efficiency?: number;
  power_distribution_efficiency?: number;
  space_efficiency?: number;
}

// Tank configuration for immersion cooling
export interface TankConfiguration {
  size: string; // e.g., "23U", "20U"
  quantity: number;
  power_density_kw_per_u: number;
}

// Immersion cooling configuration
export interface ImmersionCoolingConfig {
  input_method: ImmersionCoolingInputMethod;
  
  // Auto-optimization
  target_power_kw?: number;
  
  // Manual configuration
  tank_configurations?: TankConfiguration[];
  
  // System parameters
  coolant_type?: string;
  pumping_efficiency?: number;
  heat_exchanger_efficiency?: number;
}

// Financial configuration parameters
export interface FinancialConfig {
  analysis_years: number;
  discount_rate?: number;
  energy_cost_kwh?: number;
  energy_escalation_rate?: number;
  maintenance_escalation_rate?: number;
  currency: Currency;
  region?: Region;
  
  // Custom parameters
  custom_discount_rate?: number;
  custom_energy_cost?: number;
  custom_labor_cost?: number;
}

// Complete calculation configuration
export interface CalculationConfiguration {
  air_cooling: AirCoolingConfig;
  immersion_cooling: ImmersionCoolingConfig;
  financial: FinancialConfig;
}

// Cost breakdown structure
export interface CostBreakdown {
  equipment: number;
  installation: number;
  infrastructure: number;
  energy?: number;
  maintenance?: number;
  coolant?: number;
  labor?: number;
  total: number;
}

// Annual cost details
export interface AnnualCosts {
  year: number;
  air_cooling: CostBreakdown;
  immersion_cooling: CostBreakdown;
  savings: number;
  savings_percent: number;
}

// PUE analysis
export interface PUEAnalysis {
  air_cooling: number;
  immersion_cooling: number;
  improvement_percent: number;
  energy_savings_kwh_annual: number;
}

// Environmental impact analysis
export interface EnvironmentalImpact {
  carbon_savings_kg_co2_annual: number;
  water_savings_gallons_annual: number;
  energy_savings_kwh_annual: number;
  carbon_footprint_reduction_percent: number;
}

// Financial metrics summary
export interface CalculationSummary {
  // Primary savings metrics
  total_capex_savings: number;
  total_opex_savings_5yr: number;
  total_tco_savings_5yr: number;
  
  // Financial performance metrics
  roi_percent: number;
  payback_months: number;
  npv_savings: number;
  irr_percent?: number;
  
  // Efficiency metrics  
  pue_air_cooling: number;
  pue_immersion_cooling: number;
  energy_efficiency_improvement: number;
  
  // Cost per unit metrics
  cost_per_kw_air_cooling: number;
  cost_per_kw_immersion_cooling: number;
  cost_per_rack_equivalent: number;
}

// Detailed calculation breakdown
export interface CalculationBreakdown {
  // CAPEX breakdown
  capex: {
    air_cooling: CostBreakdown;
    immersion_cooling: CostBreakdown;
    savings: number;
    savings_percent: number;
  };
  
  // Annual OPEX breakdown
  opex_annual: AnnualCosts[];
  
  // Cumulative TCO progression
  tco_cumulative: {
    year: number;
    air_cooling: number;
    immersion_cooling: number;
    savings: number;
    npv_savings: number;
  }[];
  
  // Maintenance cost details
  maintenance_schedule: {
    year: number;
    air_cooling_maintenance: number;
    immersion_cooling_maintenance: number;
    major_overhauls: number;
  }[];
}

// Chart data for visualization
export interface ChartData {
  // TCO progression over time
  tco_progression: {
    year: number;
    air_cooling: number;
    immersion_cooling: number;
    savings: number;
    cumulative_savings: number;
  }[];
  
  // PUE comparison
  pue_comparison: {
    air_cooling: number;
    immersion_cooling: number;
  };
  
  // Cost category breakdown
  cost_categories: {
    [category: string]: {
      air_cooling: number;
      immersion_cooling: number;
      difference: number;
    };
  };
  
  // Sensitivity analysis data
  sensitivity_analysis?: {
    parameter: string;
    scenarios: {
      value: number;
      tco_savings: number;
      roi_percent: number;
    }[];
  }[];
}

// Complete calculation results
export interface CalculationResults {
  // High-level summary
  summary: CalculationSummary;
  
  // Detailed breakdown
  breakdown: CalculationBreakdown;
  
  // Chart and visualization data
  charts: ChartData;
  
  // Environmental analysis
  environmental: EnvironmentalImpact;
  
  // PUE analysis details
  pue_analysis: PUEAnalysis;
  
  // Calculation metadata
  calculation_id?: string;
  session_id?: string;
  calculated_at: string;
  calculation_version: string;
  configuration_hash: string;
}

// Calculation request and response types
export interface CalculationRequest {
  configuration: CalculationConfiguration;
  locale?: Locale;
  save_session?: boolean;
  session_expiry_days?: number;
}

export interface CalculationResponse {
  success: boolean;
  data: CalculationResults;
  meta: {
    timestamp: string;
    version: string;
    locale: Locale;
    currency: Currency;
    processing_time_ms: number;
  };
}

// Calculation validation
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResponse {
  success: boolean;
  data: {
    valid: boolean;
    warnings: ValidationWarning[];
    estimated_processing_time?: number;
  };
}

// Sensitivity analysis configuration
export interface SensitivityAnalysisConfig {
  parameters: {
    name: string;
    base_value: number;
    variation_range: number; // percentage
    steps: number;
  }[];
  metrics: ('tco_savings' | 'roi_percent' | 'payback_months')[];
}

// Scenario comparison
export interface ScenarioComparison {
  base_scenario: CalculationResults;
  alternative_scenarios: {
    name: string;
    description: string;
    configuration: CalculationConfiguration;
    results: CalculationResults;
  }[];
  comparison_metrics: {
    parameter: string;
    scenarios: {
      name: string;
      value: number;
      difference_from_base: number;
      difference_percent: number;
    }[];
  }[];
}

// Calculation history and sessions
export interface CalculationSession extends BaseEntity {
  session_token: string;
  configuration: CalculationConfiguration;
  results?: CalculationResults;
  locale: Locale;
  currency: Currency;
  
  // Session management
  last_accessed_at: string;
  expires_at?: string;
  access_count: number;
  
  // Sharing
  is_public: boolean;
  share_token?: string;
  
  // Metadata
  ip_address?: string;
  user_agent?: string;
  referer_url?: string;
}