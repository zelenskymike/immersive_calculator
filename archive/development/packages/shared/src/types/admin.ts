/**
 * Administrative and analytics types
 */

import type { BaseEntity, Currency, Locale, Region, DateRange } from './common';

// Admin user roles and permissions
export type AdminRole = 'super_admin' | 'admin' | 'config_manager' | 'analyst' | 'viewer';

export interface AdminUser extends BaseEntity {
  username: string;
  email: string;
  full_name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  
  // Authentication
  last_login_at?: string;
  password_changed_at?: string;
  failed_login_attempts: number;
  locked_until?: string;
  
  // Profile
  timezone?: string;
  locale: Locale;
  avatar_url?: string;
  
  // Status
  is_active: boolean;
  is_verified: boolean;
  
  // Metadata
  created_by?: string;
  last_modified_by?: string;
}

// Admin permissions
export type AdminPermission = 
  | 'config.read' | 'config.write' | 'config.delete'
  | 'users.read' | 'users.write' | 'users.delete'
  | 'analytics.read' | 'analytics.export'
  | 'reports.read' | 'reports.delete'
  | 'system.monitor' | 'system.maintain'
  | 'audit.read' | 'audit.export';

// System configuration
export interface SystemConfiguration extends BaseEntity {
  category: string;
  key: string;
  value: any;
  value_type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  
  // Metadata
  description: string;
  is_sensitive: boolean;
  is_public: boolean;
  requires_restart: boolean;
  
  // Validation
  validation_rules?: {
    min_value?: number;
    max_value?: number;
    allowed_values?: any[];
    pattern?: string;
    required?: boolean;
  };
  
  // Environment
  environment?: 'development' | 'staging' | 'production' | 'all';
  
  // Lifecycle
  effective_date?: string;
  deprecated_date?: string;
  
  // Audit
  last_modified_by: string;
  change_reason?: string;
}

// Usage analytics
export interface UsageAnalytics {
  // Time period
  period: DateRange;
  granularity: 'hour' | 'day' | 'week' | 'month';
  
  // Summary metrics
  summary: {
    total_calculations: number;
    unique_sessions: number;
    total_reports_generated: number;
    total_shares_created: number;
    average_calculation_time_ms: number;
    average_session_duration_ms: number;
  };
  
  // Time series data
  time_series: {
    timestamp: string;
    calculations: number;
    sessions: number;
    reports: number;
    shares: number;
    errors: number;
  }[];
  
  // Geographic breakdown
  by_country: {
    country_code: string;
    country_name: string;
    calculations: number;
    sessions: number;
  }[];
  
  // Currency breakdown
  by_currency: {
    currency: Currency;
    calculations: number;
    percentage: number;
    average_savings: number;
  }[];
  
  // Language breakdown
  by_locale: {
    locale: Locale;
    calculations: number;
    percentage: number;
  }[];
  
  // Popular configurations
  popular_configurations: {
    air_cooling_racks: number;
    immersion_tanks: number;
    analysis_years: number;
    frequency: number;
  }[];
  
  // Performance metrics
  performance: {
    average_response_time_ms: number;
    p95_response_time_ms: number;
    p99_response_time_ms: number;
    error_rate_percent: number;
    availability_percent: number;
  };
}

// System health and monitoring
export interface SystemHealth {
  timestamp: string;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  
  // Component health
  components: {
    database: ComponentHealth;
    redis: ComponentHealth;
    file_storage: ComponentHealth;
    external_apis: ComponentHealth;
  };
  
  // Resource utilization
  resources: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    network_io_mbps: number;
  };
  
  // Application metrics
  application: {
    active_connections: number;
    request_rate_per_minute: number;
    cache_hit_rate_percent: number;
    queue_size: number;
  };
}

export interface ComponentHealth {
  status: 'pass' | 'fail' | 'warn';
  response_time_ms?: number;
  last_check: string;
  error_message?: string;
  uptime_percent?: number;
}

// System audit logs
export interface SystemAuditLog extends BaseEntity {
  // Event information
  event_type: 'config_change' | 'user_action' | 'system_event' | 'security_event';
  event_subtype?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Actor information
  actor_type: 'user' | 'system' | 'api' | 'scheduled_job';
  actor_id?: string;
  actor_name?: string;
  
  // Target information
  target_type?: string;
  target_id?: string;
  target_name?: string;
  
  // Event details
  event_data: Record<string, any>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  
  // Context
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  correlation_id?: string;
  
  // Result
  success: boolean;
  error_message?: string;
  
  // Timestamp
  event_timestamp: string;
}

// Configuration audit trail
export interface ConfigurationAudit extends BaseEntity {
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  
  // Change details
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields?: string[];
  
  // Actor information
  changed_by: string;
  session_id?: string;
  application_name?: string;
  
  // Context
  change_reason?: string;
  ip_address?: string;
  user_agent?: string;
  
  // Approval workflow
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  approval_comments?: string;
  
  // Timestamp
  changed_at: string;
}

// Error tracking
export interface ErrorLog extends BaseEntity {
  // Error classification
  error_type: 'application' | 'validation' | 'security' | 'performance' | 'integration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Error details
  error_code?: string;
  error_message: string;
  stack_trace?: string;
  
  // Context
  endpoint?: string;
  method?: string;
  request_id?: string;
  session_id?: string;
  user_id?: string;
  
  // Request information
  request_data?: Record<string, any>;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  
  // Environment
  environment: 'development' | 'staging' | 'production';
  version: string;
  
  // Resolution
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  
  // Occurrence tracking
  occurrence_count: number;
  first_occurred_at: string;
  last_occurred_at: string;
}

// Performance monitoring
export interface PerformanceMetric extends BaseEntity {
  metric_name: string;
  metric_type: 'counter' | 'gauge' | 'histogram' | 'timer';
  
  // Value and metadata
  value: number;
  unit: string;
  tags: Record<string, string>;
  
  // Time information
  timestamp: string;
  period_start?: string;
  period_end?: string;
  
  // Aggregation data (for histograms/timers)
  aggregation_data?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    count: number;
  };
}

// API analytics
export interface APIAnalytics {
  period: DateRange;
  
  // Request statistics
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  error_rate_percent: number;
  
  // Performance
  average_response_time_ms: number;
  median_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  
  // Endpoint breakdown
  by_endpoint: {
    endpoint: string;
    method: string;
    request_count: number;
    error_rate_percent: number;
    average_response_time_ms: number;
  }[];
  
  // Status code distribution
  by_status_code: {
    status_code: number;
    count: number;
    percentage: number;
  }[];
  
  // Rate limiting
  rate_limited_requests: number;
  top_rate_limited_ips: {
    ip_address: string;
    request_count: number;
    blocked_count: number;
  }[];
}

// Admin dashboard data
export interface AdminDashboard {
  timestamp: string;
  
  // Quick stats
  quick_stats: {
    calculations_today: number;
    reports_generated_today: number;
    active_sessions: number;
    system_health: 'healthy' | 'degraded' | 'unhealthy';
  };
  
  // Recent activity
  recent_activity: {
    recent_calculations: {
      timestamp: string;
      currency: Currency;
      savings_amount: number;
    }[];
    
    recent_reports: {
      timestamp: string;
      report_type: string;
      status: string;
    }[];
    
    recent_errors: {
      timestamp: string;
      error_type: string;
      severity: string;
      message: string;
    }[];
  };
  
  // Alerts and notifications
  alerts: {
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }[];
  
  // System resources
  system_resources: {
    cpu_usage_percent: number;
    memory_usage_percent: number;
    disk_usage_percent: number;
    active_connections: number;
  };
}