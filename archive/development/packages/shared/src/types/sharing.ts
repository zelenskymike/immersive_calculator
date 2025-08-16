/**
 * Sharing and collaboration types
 */

import type { BaseEntity, Locale, Currency } from './common';
import type { CalculationResults } from './calculation';

// Share link access levels
export type ShareAccessLevel = 'view_only' | 'download_allowed' | 'full_access';

// Share link security settings
export interface ShareSecuritySettings {
  password_protected: boolean;
  password?: string;
  ip_restrictions?: string[]; // CIDR blocks or IP addresses
  domain_restrictions?: string[]; // Email domains or referrer domains
  max_access_count?: number;
  single_use?: boolean;
}

// Share link configuration
export interface ShareLinkConfig {
  expires_in_days: number;
  access_level: ShareAccessLevel;
  security_settings: ShareSecuritySettings;
  
  // Display options
  show_configuration: boolean;
  show_detailed_breakdown: boolean;
  show_charts: boolean;
  show_environmental_impact: boolean;
  
  // Branding for shared view
  custom_branding?: {
    company_name?: string;
    logo_url?: string;
    primary_color?: string;
    custom_message?: string;
  };
  
  // Analytics
  track_analytics: boolean;
  send_access_notifications: boolean;
  notification_email?: string;
}

// Share link entity
export interface ShareLink extends BaseEntity {
  // Associated calculation session
  session_id: string;
  
  // Share token and URL
  share_token: string;
  share_url: string;
  
  // Configuration
  config: ShareLinkConfig;
  
  // Access tracking
  access_count: number;
  last_accessed_at?: string;
  
  // Security
  is_active: boolean;
  expires_at: string;
  revoked_at?: string;
  revoked_by?: string;
  revocation_reason?: string;
  
  // Metadata
  created_by?: string;
  description?: string;
  tags?: string[];
}

// Share link creation request
export interface CreateShareLinkRequest {
  session_id: string;
  config?: Partial<ShareLinkConfig>;
  description?: string;
  tags?: string[];
}

// Share link response
export interface ShareLinkResponse {
  success: boolean;
  data: {
    share_id: string;
    share_token: string;
    share_url: string;
    expires_at: string;
    access_count: number;
    config: ShareLinkConfig;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

// Shared calculation access response
export interface SharedCalculationResponse {
  success: boolean;
  data: {
    calculation_results: CalculationResults;
    metadata: {
      shared_at: string;
      expires_at: string;
      access_count: number;
      remaining_access?: number;
      
      // Display configuration
      display_config: {
        show_configuration: boolean;
        show_detailed_breakdown: boolean;
        show_charts: boolean;
        show_environmental_impact: boolean;
      };
      
      // Branding
      branding?: ShareLinkConfig['custom_branding'];
    };
    
    // Limited configuration data (if allowed)
    configuration_summary?: {
      air_cooling_racks: number;
      immersion_cooling_tanks: number;
      analysis_years: number;
      currency: Currency;
      region: string;
    };
  };
  meta: {
    timestamp: string;
    locale: Locale;
    version: string;
  };
}

// Share link access log entry
export interface ShareAccessLog extends BaseEntity {
  share_id: string;
  
  // Access details
  accessed_at: string;
  ip_address?: string;
  user_agent?: string;
  referer_url?: string;
  
  // Geographic data (optional)
  country_code?: string;
  region_code?: string;
  city?: string;
  
  // Access type
  access_type: 'view' | 'download' | 'api_access';
  resource_accessed?: string; // specific resource or endpoint
  
  // Session information
  session_duration_ms?: number;
  pages_viewed?: number;
  actions_performed?: string[];
  
  // Status
  access_granted: boolean;
  access_denied_reason?: string;
}

// Share analytics summary
export interface ShareAnalytics {
  share_id: string;
  
  // Access statistics
  total_access_count: number;
  unique_visitors: number;
  
  // Time-based analytics
  access_by_date: {
    date: string;
    access_count: number;
    unique_visitors: number;
  }[];
  
  // Geographic analytics
  access_by_country: {
    country_code: string;
    country_name: string;
    access_count: number;
  }[];
  
  // Technology analytics
  browsers: {
    browser: string;
    count: number;
    percentage: number;
  }[];
  
  devices: {
    device_type: string;
    count: number;
    percentage: number;
  }[];
  
  // Engagement metrics
  average_session_duration_ms: number;
  bounce_rate_percent: number;
  downloads_count: number;
  
  // Performance metrics
  average_load_time_ms: number;
  error_rate_percent: number;
}

// Collaborative features
export interface CollaborationInvite extends BaseEntity {
  share_id: string;
  
  // Invitee information
  invitee_email: string;
  invitee_name?: string;
  
  // Invitation details
  invitation_message?: string;
  access_level: ShareAccessLevel;
  
  // Status
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invited_at: string;
  responded_at?: string;
  
  // Access tracking (after acceptance)
  first_access_at?: string;
  last_access_at?: string;
  access_count: number;
  
  // Expiration
  expires_at: string;
  
  // Metadata
  invited_by: string;
  notes?: string;
}

// Share link management operations
export interface ShareLinkUpdate {
  description?: string;
  tags?: string[];
  config?: Partial<ShareLinkConfig>;
}

export interface ShareLinkRevocation {
  revocation_reason: string;
  notify_previous_accessors?: boolean;
  replacement_share_id?: string;
}

// Share link list response
export interface ShareLinksListResponse {
  success: boolean;
  data: {
    shares: (ShareLink & {
      analytics_summary: {
        total_access_count: number;
        unique_visitors: number;
        last_accessed_at?: string;
      };
    })[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}

// Public share directory entry (for public shares)
export interface PublicShareEntry {
  share_id: string;
  title: string;
  description?: string;
  tags: string[];
  
  // Summary information
  calculation_summary: {
    total_savings: number;
    roi_percent: number;
    payback_months: number;
    currency: Currency;
  };
  
  // Metadata
  created_at: string;
  access_count: number;
  rating?: {
    average: number;
    count: number;
  };
  
  // Branding
  company_name?: string;
  logo_url?: string;
}

// Share templates for common sharing scenarios
export interface ShareTemplate {
  id: string;
  name: string;
  description: string;
  
  // Template configuration
  default_config: ShareLinkConfig;
  
  // Use case metadata
  use_case: 'sales_presentation' | 'board_meeting' | 'technical_review' | 'public_showcase';
  target_audience: 'executives' | 'technical_staff' | 'customers' | 'general_public';
  
  // Customization options
  customizable_fields: string[];
  required_fields: string[];
  
  // Template metadata
  is_default: boolean;
  popularity_score: number;
  created_by?: string;
  updated_at: string;
}