/**
 * Common types shared across the TCO Calculator application
 */

// Supported languages for internationalization
export type Locale = 'en' | 'ar';

// Supported currencies for financial calculations
export type Currency = 'USD' | 'EUR' | 'SAR' | 'AED';

// Supported regions for pricing adjustments
export type Region = 'US' | 'EU' | 'ME';

// Standard API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: ResponseMeta;
}

// API error response format
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta: ResponseMeta;
}

// Response metadata
export interface ResponseMeta {
  timestamp: string;
  request_id: string;
  version: string;
  locale?: Locale;
  currency?: Currency;
}

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

// Multi-language text object
export interface LocalizedText {
  en: string;
  ar: string;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Generic paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Health check response
export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  response_time_ms?: number;
  output?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    external_services: HealthCheck;
  };
}

// Generic entity with timestamps
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Generic entity with versioning
export interface VersionedEntity extends BaseEntity {
  version: number;
  effective_date: string;
  expiry_date?: string;
  status: 'active' | 'deprecated' | 'discontinued';
}

// File upload information
export interface FileInfo {
  filename: string;
  size: number;
  mime_type: string;
  url?: string;
}

// Generic configuration item
export interface ConfigurationItem {
  key: string;
  value: any;
  category: string;
  description?: string;
  validation_rules?: Record<string, any>;
}

// Error codes used throughout the application
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Authentication/Authorization errors  
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  EXPIRED = 'EXPIRED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Business logic errors
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  REPORT_GENERATION_ERROR = 'REPORT_GENERATION_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// Status types for various entities
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Generic filter interface for list endpoints
export interface ListFilter {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

// Utility types for making properties optional or required
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Date range utilities
export interface DateRange {
  start_date: string;
  end_date: string;
}

// Numeric range utilities
export interface NumericRange {
  min: number;
  max: number;
}

// Generic key-value pair
export interface KeyValuePair<T = any> {
  key: string;
  value: T;
  label?: string;
}

// Generic option for select inputs
export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}