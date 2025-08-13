/**
 * Configuration and equipment types
 */

import type { BaseEntity, Currency, LocalizedText, Region, VersionedEntity } from './common';

// Equipment categories
export type EquipmentCategory = 'air_cooling' | 'immersion_cooling';
export type EquipmentSubcategory = 'rack' | 'hvac' | 'tank' | 'pump' | 'coolant' | 'infrastructure';

// Equipment pricing structure
export interface EquipmentPricing {
  equipment_cost: number;
  installation_cost: number;
  shipping_cost?: number;
  warranty_cost_annual?: number;
  maintenance_annual_pct: number;
}

// Multi-currency pricing
export type CurrencyPricing = Record<Currency, EquipmentPricing>;

// Regional adjustments
export interface RegionalAdjustment {
  cost_multiplier: number;
  availability: boolean;
  import_duty_pct?: number;
  shipping_adjustment?: number;
}

// Equipment configuration entity
export interface EquipmentConfiguration extends VersionedEntity {
  category: EquipmentCategory;
  subcategory: EquipmentSubcategory;
  item_code: string;
  display_name: LocalizedText;
  description?: LocalizedText;
  manufacturer?: string;
  model?: string;
  
  // Technical specifications (flexible structure)
  specifications: {
    physical?: {
      height_units?: number;
      width_mm?: number;
      depth_mm?: number;
      weight_kg?: number;
    };
    electrical?: {
      power_consumption_kw?: number;
      power_capacity_kw?: number;
      efficiency_rating?: number;
    };
    thermal?: {
      heat_dissipation_kw?: number;
      cooling_capacity_kw?: number;
      operating_temp_range?: {
        min: number;
        max: number;
      };
    };
    capacity?: {
      server_slots?: number;
      max_density_kw_per_u?: number;
      coolant_volume_liters?: number;
    };
    performance?: {
      pue?: number;
      cop?: number;
      efficiency?: number;
    };
  };
  
  // Multi-currency pricing
  base_pricing: CurrencyPricing;
  
  // Regional variations
  regional_adjustments?: Record<Region, RegionalAdjustment>;
  
  // Metadata
  created_by?: string;
  updated_by?: string;
}

// Financial parameter categories
export type ParameterCategory = 'discount_rates' | 'energy_costs' | 'labor_costs' | 'escalation_rates';

// Financial parameter entity
export interface FinancialParameter extends BaseEntity {
  parameter_category: ParameterCategory;
  parameter_name: string;
  parameter_code: string;
  default_value: number;
  currency_code?: Currency;
  unit?: string;
  
  // Regional variations
  regional_values?: Record<Region, {
    value: number;
    unit?: string;
  }>;
  
  // Validation
  min_value?: number;
  max_value?: number;
  validation_rules?: Record<string, any>;
  
  // Metadata
  description?: LocalizedText;
  source?: string;
  confidence_level?: 'high' | 'medium' | 'low';
  last_updated_source?: string;
  
  // Lifecycle
  effective_date: string;
  expiry_date?: string;
  status: 'active' | 'deprecated';
  created_by?: string;
  updated_by?: string;
}

// Exchange rate entity
export interface ExchangeRate extends BaseEntity {
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  inverse_rate: number;
  source: string;
  rate_type: 'spot' | 'forward' | 'average';
  confidence_score?: number;
  effective_date: string;
  effective_timestamp: string;
}

// Equipment configuration request/response types
export interface CreateEquipmentConfigRequest {
  category: EquipmentCategory;
  subcategory: EquipmentSubcategory;
  item_code: string;
  display_name: LocalizedText;
  description?: LocalizedText;
  manufacturer?: string;
  model?: string;
  specifications: EquipmentConfiguration['specifications'];
  base_pricing: CurrencyPricing;
  regional_adjustments?: Record<Region, RegionalAdjustment>;
  effective_date?: string;
}

export interface UpdateEquipmentConfigRequest extends CreateEquipmentConfigRequest {
  id: string;
  version?: number;
}

export interface EquipmentConfigResponse {
  success: boolean;
  data: EquipmentConfiguration[];
  meta: {
    timestamp: string;
    version: string;
    currency?: Currency;
    region?: Region;
  };
}

// Financial parameter response types
export interface FinancialParametersResponse {
  success: boolean;
  data: FinancialParameter[];
  meta: {
    timestamp: string;
    version: string;
    currency?: Currency;
    region?: Region;
  };
}

// Exchange rates response
export interface ExchangeRatesResponse {
  success: boolean;
  data: {
    base_currency: Currency;
    effective_date: string;
    rates: Record<Currency, number>;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

// Configuration filters
export interface EquipmentConfigFilter {
  category?: EquipmentCategory;
  subcategory?: EquipmentSubcategory;
  currency?: Currency;
  region?: Region;
  effective_date?: string;
  status?: 'active' | 'deprecated' | 'discontinued';
}

export interface FinancialParameterFilter {
  category?: ParameterCategory;
  currency?: Currency;
  region?: Region;
  effective_date?: string;
  status?: 'active' | 'deprecated';
}

// Preset configurations for common scenarios
export interface PresetConfiguration {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: 'small' | 'medium' | 'large' | 'enterprise';
  air_cooling_config: any;
  immersion_cooling_config: any;
  financial_config: any;
  tags?: string[];
  is_public: boolean;
  created_by?: string;
  created_at: string;
}