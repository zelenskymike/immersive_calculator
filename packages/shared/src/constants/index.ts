/**
 * Shared constants and configuration parameters for TCO Calculator
 */

import type { Currency, Locale, Region } from '../types/common';

// Application constants
export const APP_NAME = 'Immersion Cooling TCO Calculator';
export const APP_VERSION = '1.0.0';
export const API_VERSION = 'v1';

// Supported locales and currencies
export const SUPPORTED_LOCALES: Locale[] = ['en', 'ar'];
export const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'SAR', 'AED'];
export const SUPPORTED_REGIONS: Region[] = ['US', 'EU', 'ME'];

// Default values
export const DEFAULT_LOCALE: Locale = 'en';
export const DEFAULT_CURRENCY: Currency = 'USD';
export const DEFAULT_REGION: Region = 'US';

// Equipment default configurations
export const EQUIPMENT_DEFAULTS = {
  // Air Cooling Defaults
  AIR_COOLING: {
    RACK_42U: {
      power_capacity_kw: 15,
      heat_dissipation_kw: 15,
      power_consumption_kw: 0.5,
      space_efficiency: 0.8,
      height_units: 42,
    },
    HVAC: {
      cop: 2.5, // Coefficient of Performance
      efficiency: 0.85,
      power_factor: 0.95,
      maintenance_factor: 0.08, // 8% annual maintenance cost
    },
    INFRASTRUCTURE: {
      power_distribution_efficiency: 0.95,
      ups_efficiency: 0.94,
      cooling_distribution_efficiency: 0.9,
    },
  },
  
  // Immersion Cooling Defaults
  IMMERSION_COOLING: {
    TANK_STANDARD: {
      pue: 1.03, // Power Usage Effectiveness
      power_density_kw_per_u: 2.0,
      coolant_volume_per_server: 12, // liters
      pump_efficiency: 0.92,
      heat_exchanger_efficiency: 0.95,
    },
    COOLANT: {
      cost_per_liter_usd: 25,
      replacement_cycle_months: 24,
      filtration_cycle_months: 6,
    },
    MAINTENANCE: {
      annual_percentage: 0.03, // 3% annual maintenance cost
      major_overhaul_years: 5,
      pump_replacement_years: 7,
    },
  },
} as const;

// Financial calculation defaults
export const FINANCIAL_DEFAULTS = {
  DISCOUNT_RATE: 0.08, // 8% corporate discount rate
  ANALYSIS_YEARS: {
    MIN: 1,
    MAX: 10,
    DEFAULT: 5,
  },
  ESCALATION_RATES: {
    ENERGY: 0.03, // 3% annual energy cost increase
    MAINTENANCE: 0.025, // 2.5% annual maintenance cost increase
    LABOR: 0.04, // 4% annual labor cost increase
  },
  ENERGY_COSTS: {
    // Default energy costs per kWh by region
    US: 0.12, // USD per kWh
    EU: 0.28, // EUR per kWh  
    ME: 0.08, // USD per kWh (Gulf states average)
  },
  LABOR_COSTS: {
    // Hourly technician rates by region
    US: 75, // USD per hour
    EU: 65, // EUR per hour
    ME: 45, // USD per hour
  },
} as const;

// PUE (Power Usage Effectiveness) benchmarks
export const PUE_BENCHMARKS = {
  EXCELLENT: 1.2,
  GOOD: 1.5,
  AVERAGE: 1.8,
  POOR: 2.0,
  // Industry standards
  AIR_COOLING_TYPICAL: 1.4,
  AIR_COOLING_BEST: 1.2,
  IMMERSION_COOLING_TYPICAL: 1.03,
  IMMERSION_COOLING_BEST: 1.02,
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  RACK_COUNT: {
    MIN: 1,
    MAX: 1000,
  },
  POWER_PER_RACK: {
    MIN: 0.5, // kW
    MAX: 50, // kW
  },
  TOTAL_POWER: {
    MIN: 1, // kW
    MAX: 50000, // kW (50 MW)
  },
  ANALYSIS_YEARS: {
    MIN: 1,
    MAX: 10,
  },
  DISCOUNT_RATE: {
    MIN: 0.01, // 1%
    MAX: 0.25, // 25%
  },
  ENERGY_COST: {
    MIN: 0.01, // $0.01 per kWh
    MAX: 1.0, // $1.00 per kWh
  },
  TANK_QUANTITY: {
    MIN: 1,
    MAX: 500,
  },
  POWER_DENSITY: {
    MIN: 0.5, // kW per U
    MAX: 5.0, // kW per U
  },
} as const;

// Currency symbols and formatting
export const CURRENCY_CONFIG: Record<Currency, {
  symbol: string;
  decimals: number;
  prefix: boolean;
  locale: string;
}> = {
  USD: {
    symbol: '$',
    decimals: 2,
    prefix: true,
    locale: 'en-US',
  },
  EUR: {
    symbol: '€',
    decimals: 2,
    prefix: false,
    locale: 'de-DE',
  },
  SAR: {
    symbol: 'ر.س',
    decimals: 2,
    prefix: false,
    locale: 'ar-SA',
  },
  AED: {
    symbol: 'د.إ',
    decimals: 2,
    prefix: false,
    locale: 'ar-AE',
  },
} as const;

// Equipment specifications by type
export const EQUIPMENT_SPECS = {
  RACKS: {
    '42U_STANDARD': {
      height_units: 42,
      power_capacity_kw: 15,
      typical_servers: 42,
    },
    '42U_HIGH_DENSITY': {
      height_units: 42,
      power_capacity_kw: 25,
      typical_servers: 42,
    },
    '45U_STANDARD': {
      height_units: 45,
      power_capacity_kw: 18,
      typical_servers: 45,
    },
  },
  IMMERSION_TANKS: {
    '1U': { height_units: 1, max_power_kw: 2, coolant_liters: 25 },
    '2U': { height_units: 2, max_power_kw: 4, coolant_liters: 50 },
    '4U': { height_units: 4, max_power_kw: 8, coolant_liters: 100 },
    '6U': { height_units: 6, max_power_kw: 12, coolant_liters: 150 },
    '8U': { height_units: 8, max_power_kw: 16, coolant_liters: 200 },
    '10U': { height_units: 10, max_power_kw: 20, coolant_liters: 250 },
    '12U': { height_units: 12, max_power_kw: 24, coolant_liters: 300 },
    '14U': { height_units: 14, max_power_kw: 28, coolant_liters: 350 },
    '16U': { height_units: 16, max_power_kw: 32, coolant_liters: 400 },
    '18U': { height_units: 18, max_power_kw: 36, coolant_liters: 450 },
    '20U': { height_units: 20, max_power_kw: 40, coolant_liters: 500 },
    '22U': { height_units: 22, max_power_kw: 44, coolant_liters: 550 },
    '23U': { height_units: 23, max_power_kw: 46, coolant_liters: 575 },
  },
} as const;

// Chart configuration defaults
export const CHART_DEFAULTS = {
  COLORS: {
    AIR_COOLING: '#1976d2', // Blue
    IMMERSION_COOLING: '#2e7d32', // Green
    SAVINGS: '#ed6c02', // Orange
    POSITIVE: '#2e7d32',
    NEGATIVE: '#d32f2f',
    NEUTRAL: '#757575',
  },
  ANIMATION_DURATION: 300,
  RESPONSIVE: true,
  MAINTAIN_ASPECT_RATIO: false,
} as const;

// Session management constants
export const SESSION_CONFIG = {
  DEFAULT_EXPIRY_DAYS: 90,
  MAX_EXPIRY_DAYS: 365,
  CLEANUP_INTERVAL_HOURS: 24,
  MAX_ACCESS_COUNT: 1000,
  SHARE_TOKEN_LENGTH: 32,
} as const;

// API rate limiting
export const RATE_LIMITS = {
  CALCULATION: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  REPORT_GENERATION: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 20,
  },
  CONFIGURATION: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 200,
  },
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  CALCULATION_TIME_MS: 1000, // Maximum calculation time
  PAGE_LOAD_TIME_MS: 2000, // Maximum page load time
  CHART_RENDER_TIME_MS: 500, // Maximum chart rendering time
  API_RESPONSE_TIME_MS: 200, // Maximum API response time
  REPORT_GENERATION_TIME_MS: 10000, // Maximum report generation time
} as const;

// Error messages (will be localized)
export const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_NUMBER: 'Please enter a valid number',
    INVALID_RANGE: 'Value must be between {min} and {max}',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_CURRENCY: 'Invalid currency code',
  },
  CALCULATION: {
    INSUFFICIENT_DATA: 'Insufficient data for calculation',
    INVALID_CONFIGURATION: 'Invalid equipment configuration',
    CALCULATION_FAILED: 'Calculation processing failed',
    TIMEOUT: 'Calculation timeout - please try again',
  },
  SESSION: {
    EXPIRED: 'Your session has expired',
    NOT_FOUND: 'Session not found',
    INVALID_TOKEN: 'Invalid session token',
  },
  SYSTEM: {
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    DATABASE_ERROR: 'Database connection error',
    INTERNAL_ERROR: 'Internal server error',
  },
} as const;

// File export limits
export const EXPORT_LIMITS = {
  MAX_REPORTS_PER_SESSION: 10,
  MAX_FILE_SIZE_MB: 50,
  SUPPORTED_FORMATS: ['pdf', 'excel', 'csv'],
  RETENTION_DAYS: 30,
} as const;

// Database configuration
export const DATABASE_CONFIG = {
  CONNECTION_POOL: {
    MIN: 5,
    MAX: 20,
    IDLE_TIMEOUT_MS: 30000,
  },
  QUERY_TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  TTL: {
    CONFIGURATION: 300, // 5 minutes
    CALCULATIONS: 3600, // 1 hour
    EXCHANGE_RATES: 86400, // 24 hours
    STATIC_DATA: 86400 * 7, // 1 week
  },
  KEYS: {
    PREFIX: 'tco_calc',
    SEPARATOR: ':',
  },
} as const;

// Monitoring and logging
export const MONITORING_CONFIG = {
  LOG_LEVELS: ['error', 'warn', 'info', 'debug'],
  METRICS: {
    COLLECTION_INTERVAL_MS: 30000,
    RETENTION_DAYS: 30,
  },
  HEALTH_CHECK: {
    INTERVAL_MS: 30000,
    TIMEOUT_MS: 5000,
  },
} as const;