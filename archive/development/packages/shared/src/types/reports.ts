/**
 * Report generation and export types
 */

import type { BaseEntity, Currency, Locale } from './common';
import type { CalculationResults } from './calculation';

// Report types and formats
export type ReportType = 'pdf' | 'excel' | 'csv';
export type ReportFormat = 'standard' | 'detailed' | 'executive_summary' | 'technical_appendix';
export type ReportStatus = 'queued' | 'generating' | 'ready' | 'error' | 'expired';

// Storage providers for generated reports
export type StorageProvider = 's3' | 'gcs' | 'azure' | 'local';

// Report branding configuration
export interface ReportBranding {
  company_name?: string;
  logo_url?: string;
  contact_info?: string;
  custom_header?: string;
  custom_footer?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
}

// Report customization options
export interface ReportCustomizations {
  include_charts: boolean;
  include_detailed_breakdown: boolean;
  include_sensitivity_analysis: boolean;
  include_environmental_impact: boolean;
  include_technical_specifications: boolean;
  include_assumptions: boolean;
  include_methodology: boolean;
  
  // Chart-specific options
  chart_style?: 'professional' | 'colorful' | 'minimal';
  chart_size?: 'small' | 'medium' | 'large';
  
  // Executive summary options
  executive_summary_length?: 'short' | 'medium' | 'detailed';
  
  // Technical detail level
  technical_detail_level?: 'basic' | 'intermediate' | 'advanced';
}

// PDF report configuration
export interface PDFReportConfig extends ReportCustomizations {
  template: ReportFormat;
  page_size?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  include_cover_page: boolean;
  include_table_of_contents: boolean;
  watermark?: string;
  password_protected?: boolean;
  password?: string;
}

// Excel report configuration  
export interface ExcelReportConfig extends ReportCustomizations {
  worksheet_organization: 'single_sheet' | 'multi_sheet';
  include_formulas: boolean;
  include_pivot_tables: boolean;
  include_data_validation: boolean;
  freeze_headers: boolean;
  auto_filter: boolean;
}

// Report generation request types
export interface PDFReportRequest {
  session_id: string;
  template?: ReportFormat;
  branding?: ReportBranding;
  customizations?: Partial<PDFReportConfig>;
  locale?: Locale;
  currency_display?: Currency;
}

export interface ExcelReportRequest {
  session_id: string;
  customizations?: Partial<ExcelReportConfig>;
  include_raw_data?: boolean;
  locale?: Locale;
  currency_display?: Currency;
}

// Generated report entity
export interface GeneratedReport extends BaseEntity {
  // Associated session
  session_id: string;
  
  // Report details
  report_type: ReportType;
  report_format: ReportFormat;
  file_name: string;
  file_size_bytes?: number;
  mime_type: string;
  
  // Storage information
  storage_provider: StorageProvider;
  storage_path: string;
  storage_region?: string;
  
  // Report configuration
  report_config: {
    branding?: ReportBranding;
    customizations: ReportCustomizations;
    locale: Locale;
    currency_display: Currency;
  };
  
  // Access tracking
  download_count: number;
  last_downloaded_at?: string;
  download_token?: string;
  
  // Lifecycle
  expires_at: string;
  status: ReportStatus;
  error_message?: string;
  
  // Generation metrics
  generation_time_ms?: number;
  processing_started_at?: string;
  processing_completed_at?: string;
}

// Report generation response
export interface ReportGenerationResponse {
  success: boolean;
  data: {
    report_id: string;
    status: ReportStatus;
    estimated_completion?: string;
    queue_position?: number;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

// Report status response
export interface ReportStatusResponse {
  success: boolean;
  data: {
    report_id: string;
    status: ReportStatus;
    progress_percent?: number;
    download_url?: string;
    expires_at?: string;
    error_message?: string;
    file_size_bytes?: number;
    
    // Processing details
    generation_time_ms?: number;
    queue_time_ms?: number;
    estimated_completion?: string;
  };
}

// Report templates configuration
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  report_type: ReportType;
  format: ReportFormat;
  is_default: boolean;
  
  // Template-specific configuration
  template_config: {
    sections: ReportSection[];
    styling: ReportStyling;
    layout: ReportLayout;
  };
  
  // Availability
  available_locales: Locale[];
  minimum_data_requirements: string[];
  
  // Metadata
  created_by?: string;
  updated_by?: string;
  version: number;
}

// Report section configuration
export interface ReportSection {
  id: string;
  name: string;
  order: number;
  required: boolean;
  conditional?: string; // Conditional display logic
  
  // Content configuration
  content_type: 'text' | 'table' | 'chart' | 'image' | 'custom';
  data_source: string;
  formatting: Record<string, any>;
}

// Report styling configuration
export interface ReportStyling {
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  spacing: {
    page_margin: number;
    section_spacing: number;
    paragraph_spacing: number;
  };
}

// Report layout configuration
export interface ReportLayout {
  page_size: string;
  orientation: string;
  columns: number;
  header_height?: number;
  footer_height?: number;
  
  // Grid system for positioning
  grid: {
    rows: number;
    columns: number;
    gap: number;
  };
}

// Report content data structure
export interface ReportData {
  // Calculation results
  calculation_results: CalculationResults;
  
  // Metadata
  metadata: {
    generated_at: string;
    generated_by?: string;
    report_version: string;
    data_version: string;
    locale: Locale;
    currency: Currency;
  };
  
  // Configuration used
  configuration_snapshot: any;
  
  // Additional context
  assumptions: {
    category: string;
    items: {
      parameter: string;
      value: any;
      source: string;
      confidence: 'high' | 'medium' | 'low';
    }[];
  }[];
  
  // Methodology notes
  methodology: {
    calculation_approach: string;
    data_sources: string[];
    limitations: string[];
    recommendations: string[];
  };
  
  // Supporting data
  supporting_data?: {
    market_benchmarks?: any;
    industry_standards?: any;
    regulatory_requirements?: any;
  };
}

// Report sharing and collaboration
export interface ReportShare {
  id: string;
  report_id: string;
  share_token: string;
  expires_at: string;
  access_count: number;
  max_access_count?: number;
  password_protected: boolean;
  
  // Permissions
  allow_download: boolean;
  allow_print: boolean;
  allow_copy: boolean;
  
  // Tracking
  access_log: {
    accessed_at: string;
    ip_address?: string;
    user_agent?: string;
    download_attempted?: boolean;
  }[];
  
  created_at: string;
  created_by?: string;
}

// Bulk report generation for multiple scenarios
export interface BulkReportRequest {
  session_ids: string[];
  report_type: ReportType;
  template: ReportFormat;
  branding?: ReportBranding;
  customizations?: ReportCustomizations;
  
  // Bulk-specific options
  combine_into_single_file: boolean;
  include_comparison_summary: boolean;
  individual_file_naming?: string; // Template for file names
}

export interface BulkReportResponse {
  success: boolean;
  data: {
    bulk_request_id: string;
    individual_reports: {
      session_id: string;
      report_id: string;
      status: ReportStatus;
    }[];
    combined_report_id?: string;
    estimated_completion: string;
  };
}