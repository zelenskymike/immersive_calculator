# Database Schema and Data Models

## Executive Summary

This document defines the comprehensive database schema for the Immersion Cooling TCO Calculator, designed to support flexible configuration management, accurate financial calculations, multi-currency operations, and audit trails. The schema leverages PostgreSQL's advanced features including JSONB storage, temporal data types, and full-text search capabilities.

## Database Design Principles

### Core Design Principles
1. **Data Integrity**: ACID compliance with proper constraints and foreign keys
2. **Financial Precision**: DECIMAL types for monetary calculations to avoid floating-point errors
3. **Flexibility**: JSONB fields for evolving configuration requirements
4. **Performance**: Strategic indexing and partitioning for scalability
5. **Auditability**: Complete audit trail for all configuration changes
6. **Temporal Consistency**: Effective dating for configuration versioning
7. **Multi-tenancy Ready**: UUID primary keys and tenant isolation support

### Schema Organization
```sql
-- Schema structure
CREATE SCHEMA tco_core;        -- Core business logic tables
CREATE SCHEMA tco_config;      -- Configuration and parameter tables
CREATE SCHEMA tco_audit;       -- Audit and logging tables
CREATE SCHEMA tco_temp;        -- Temporary/session tables

-- Set search path
SET search_path = tco_core, tco_config, tco_audit, tco_temp, public;
```

## Core Configuration Tables

### Equipment Configuration

```sql
-- Equipment specifications and pricing
CREATE TABLE tco_config.equipment_configurations (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'air_cooling', 'immersion_cooling'
    subcategory VARCHAR(50) NOT NULL, -- 'rack', 'hvac', 'tank', 'pump', 'coolant'
    item_code VARCHAR(50) NOT NULL, -- Unique item identifier
    
    -- Descriptive information
    display_name JSONB NOT NULL, -- Multi-language display names
    description JSONB, -- Multi-language descriptions
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    
    -- Technical specifications (flexible JSON structure)
    specifications JSONB NOT NULL,
    /* Example specifications structure:
    {
      "physical": {
        "height_units": 42,
        "width_mm": 600,
        "depth_mm": 1000,
        "weight_kg": 100
      },
      "electrical": {
        "power_consumption_kw": 0.5,
        "power_capacity_kw": 15,
        "efficiency_rating": 0.95
      },
      "thermal": {
        "heat_dissipation_kw": 15,
        "cooling_capacity_kw": 20,
        "operating_temp_range": {"min": 15, "max": 35}
      },
      "capacity": {
        "server_slots": 42,
        "max_density_kw_per_u": 1.5
      }
    }
    */
    
    -- Multi-currency pricing
    base_pricing JSONB NOT NULL,
    /* Example pricing structure:
    {
      "USD": {
        "equipment_cost": 5000.00,
        "installation_cost": 2000.00,
        "shipping_cost": 300.00,
        "warranty_cost_annual": 250.00,
        "maintenance_cost_annual_pct": 0.05
      },
      "EUR": {
        "equipment_cost": 4200.00,
        "installation_cost": 1680.00,
        "shipping_cost": 250.00,
        "warranty_cost_annual": 210.00,
        "maintenance_cost_annual_pct": 0.05
      }
    }
    */
    
    -- Regional variations
    regional_adjustments JSONB DEFAULT '{}',
    /* Example regional adjustments:
    {
      "US": {"cost_multiplier": 1.0, "availability": true},
      "EU": {"cost_multiplier": 1.1, "availability": true},
      "ME": {"cost_multiplier": 1.15, "availability": true, "import_duty_pct": 0.05}
    }
    */
    
    -- Lifecycle and versioning
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'deprecated', 'discontinued'
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_category CHECK (category IN ('air_cooling', 'immersion_cooling')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'deprecated', 'discontinued')),
    CONSTRAINT valid_version CHECK (version > 0),
    CONSTRAINT valid_effective_date CHECK (expiry_date IS NULL OR effective_date < expiry_date),
    
    -- Unique constraint for active items
    UNIQUE (category, subcategory, item_code, version)
);

-- Indexes for performance
CREATE INDEX idx_equipment_config_category_active 
ON tco_config.equipment_configurations(category, subcategory, effective_date DESC) 
WHERE status = 'active' AND (expiry_date IS NULL OR expiry_date > NOW());

CREATE INDEX idx_equipment_config_search 
ON tco_config.equipment_configurations 
USING gin(to_tsvector('english', item_code || ' ' || manufacturer || ' ' || model));

-- Trigger for automatic update timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_equipment_config_updated 
BEFORE UPDATE ON tco_config.equipment_configurations
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
```

### Financial Parameters

```sql
-- Financial calculation parameters
CREATE TABLE tco_config.financial_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parameter identification
    parameter_category VARCHAR(50) NOT NULL, -- 'discount_rates', 'energy_costs', 'labor_costs'
    parameter_name VARCHAR(100) NOT NULL,
    parameter_code VARCHAR(50) NOT NULL, -- Programmatic identifier
    
    -- Value and currency
    default_value DECIMAL(15,6) NOT NULL,
    currency_code VARCHAR(3), -- NULL for percentage/ratio parameters
    unit VARCHAR(20), -- 'percent', 'per_kwh', 'per_hour', 'per_year'
    
    -- Regional variations
    regional_values JSONB DEFAULT '{}',
    /* Example structure:
    {
      "US": {"value": 0.12, "unit": "per_kwh"},
      "EU": {"value": 0.28, "unit": "per_kwh"},
      "ME": {"value": 0.08, "unit": "per_kwh"}
    }
    */
    
    -- Validation ranges
    min_value DECIMAL(15,6),
    max_value DECIMAL(15,6),
    validation_rules JSONB,
    
    -- Metadata
    description JSONB, -- Multi-language descriptions
    source VARCHAR(200), -- Data source reference
    confidence_level VARCHAR(20), -- 'high', 'medium', 'low'
    last_updated_source TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Audit fields
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_financial_status CHECK (status IN ('active', 'deprecated')),
    CONSTRAINT valid_currency CHECK (currency_code IS NULL OR currency_code IN ('USD', 'EUR', 'SAR', 'AED')),
    CONSTRAINT valid_confidence CHECK (confidence_level IN ('high', 'medium', 'low')),
    CONSTRAINT valid_value_range CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value),
    
    UNIQUE (parameter_code, effective_date)
);

-- Sample financial parameters
INSERT INTO tco_config.financial_parameters 
(parameter_category, parameter_name, parameter_code, default_value, currency_code, unit, description) VALUES
('discount_rates', 'Corporate Discount Rate', 'corporate_discount_rate', 0.08, NULL, 'percent', 
 '{"en": "Standard corporate discount rate for NPV calculations", "ar": "معدل الخصم الشركاتي القياسي لحسابات صافي القيمة الحالية"}'),
('energy_costs', 'Industrial Energy Rate - US', 'energy_rate_us', 0.12, 'USD', 'per_kwh',
 '{"en": "Average US industrial electricity rate", "ar": "متوسط سعر الكهرباء الصناعية في الولايات المتحدة"}'),
('labor_costs', 'Data Center Technician Rate', 'dc_tech_hourly_rate', 75.00, 'USD', 'per_hour',
 '{"en": "Hourly rate for data center maintenance technician", "ar": "الأجر بالساعة لفني صيانة مركز البيانات"}');
```

### Exchange Rates

```sql
-- Currency exchange rates with historical tracking
CREATE TABLE tco_config.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Currency pair
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    
    -- Exchange rate data
    rate DECIMAL(12,6) NOT NULL,
    inverse_rate DECIMAL(12,6) GENERATED ALWAYS AS (1.0 / rate) STORED,
    
    -- Rate metadata
    source VARCHAR(50) NOT NULL, -- 'ECB', 'FED', 'manual', 'api_xe'
    rate_type VARCHAR(20) NOT NULL DEFAULT 'spot', -- 'spot', 'forward', 'average'
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    
    -- Temporal data
    effective_date DATE NOT NULL,
    effective_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_currencies CHECK (
        from_currency IN ('USD', 'EUR', 'SAR', 'AED') AND 
        to_currency IN ('USD', 'EUR', 'SAR', 'AED') AND 
        from_currency != to_currency
    ),
    CONSTRAINT positive_rate CHECK (rate > 0),
    CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    CONSTRAINT valid_rate_type CHECK (rate_type IN ('spot', 'forward', 'average')),
    
    UNIQUE (from_currency, to_currency, effective_date, source)
);

-- Partitioning by year for performance
CREATE TABLE tco_config.exchange_rates_y2025 
PARTITION OF tco_config.exchange_rates
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Indexes for currency lookups
CREATE INDEX idx_exchange_rates_lookup 
ON tco_config.exchange_rates(from_currency, to_currency, effective_date DESC);

CREATE INDEX idx_exchange_rates_date 
ON tco_config.exchange_rates(effective_date DESC);

-- Function to get current exchange rate
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(12,6) AS $$
DECLARE
    v_rate DECIMAL(12,6);
BEGIN
    -- Direct rate lookup
    SELECT rate INTO v_rate
    FROM tco_config.exchange_rates
    WHERE from_currency = p_from_currency 
      AND to_currency = p_to_currency
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- If not found, try inverse rate
    IF v_rate IS NULL THEN
        SELECT 1.0 / rate INTO v_rate
        FROM tco_config.exchange_rates
        WHERE from_currency = p_to_currency 
          AND to_currency = p_from_currency
          AND effective_date <= p_date
        ORDER BY effective_date DESC
        LIMIT 1;
    END IF;
    
    -- If same currency, return 1.0
    IF v_rate IS NULL AND p_from_currency = p_to_currency THEN
        v_rate := 1.0;
    END IF;
    
    RETURN COALESCE(v_rate, 1.0);
END;
$$ LANGUAGE plpgsql STABLE;
```

## Session and Calculation Tables

### Calculation Sessions

```sql
-- User calculation sessions
CREATE TABLE tco_core.calculation_sessions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(64) UNIQUE NOT NULL, -- For URL sharing
    
    -- Input configuration
    configuration JSONB NOT NULL,
    /* Example configuration structure:
    {
      "air_cooling": {
        "input_method": "rack_count",
        "rack_count": 100,
        "rack_type": "42U_standard",
        "power_per_rack_kw": 12,
        "total_power_kw": 1200,
        "hvac_efficiency": 0.85,
        "power_distribution_efficiency": 0.95
      },
      "immersion_cooling": {
        "input_method": "auto_optimize",
        "target_power_kw": 1200,
        "tank_configurations": [
          {"size": "23U", "quantity": 25, "power_density_kw_per_u": 2.0},
          {"size": "20U", "quantity": 30, "power_density_kw_per_u": 1.8}
        ],
        "coolant_type": "3M_Novec_7100",
        "pumping_efficiency": 0.92
      },
      "financial": {
        "analysis_years": 5,
        "discount_rate": 0.08,
        "energy_cost_kwh": 0.12,
        "energy_escalation_rate": 0.03,
        "maintenance_escalation_rate": 0.025,
        "currency": "USD",
        "region": "US"
      }
    }
    */
    
    -- Calculation results
    results JSONB,
    /* Example results structure:
    {
      "summary": {
        "total_capex_savings": 125000.00,
        "total_opex_savings_5yr": 450000.00,
        "total_tco_savings_5yr": 575000.00,
        "roi_percent": 23.5,
        "payback_months": 18,
        "npv_savings": 485000.00,
        "pue_air_cooling": 1.4,
        "pue_immersion_cooling": 1.03,
        "energy_efficiency_improvement": 26.4
      },
      "breakdown": {
        "capex": { ... },
        "opex_annual": [ ... ],
        "tco_cumulative": [ ... ]
      },
      "environmental": {
        "carbon_savings_kg_co2_annual": 75000,
        "water_savings_gallons_annual": 125000
      }
    }
    */
    
    -- Metadata
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    calculation_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    
    -- Session management
    ip_address INET,
    user_agent TEXT,
    referer_url TEXT,
    
    -- Temporal data
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and sharing
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'shared', 'expired', 'archived'
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    access_count INTEGER NOT NULL DEFAULT 0,
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(configuration->>'description', '') || ' ' ||
            COALESCE(configuration->>'tags', '') || ' ' ||
            COALESCE(configuration->'financial'->>'region', '')
        )
    ) STORED,
    
    -- Constraints
    CONSTRAINT valid_locale CHECK (locale IN ('en', 'ar')),
    CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'SAR', 'AED')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'shared', 'expired', 'archived')),
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Partitioning by month for performance
CREATE TABLE tco_core.calculation_sessions_y2025m08 
PARTITION OF tco_core.calculation_sessions
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- Indexes for performance
CREATE INDEX idx_calculation_sessions_token 
ON tco_core.calculation_sessions(session_token) 
WHERE status = 'active';

CREATE INDEX idx_calculation_sessions_expires 
ON tco_core.calculation_sessions(expires_at) 
WHERE expires_at IS NOT NULL;

CREATE INDEX idx_calculation_sessions_public 
ON tco_core.calculation_sessions(is_public, created_at DESC) 
WHERE is_public = TRUE;

CREATE INDEX idx_calculation_sessions_search 
ON tco_core.calculation_sessions 
USING gin(search_vector);

-- Automatic session cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Archive expired sessions older than 30 days
    UPDATE tco_core.calculation_sessions 
    SET status = 'archived'
    WHERE status = 'expired' 
      AND expires_at < NOW() - INTERVAL '30 days';
      
    -- Delete archived sessions older than 1 year
    DELETE FROM tco_core.calculation_sessions 
    WHERE status = 'archived' 
      AND created_at < NOW() - INTERVAL '1 year';
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Mark expired sessions
    UPDATE tco_core.calculation_sessions 
    SET status = 'expired'
    WHERE status IN ('active', 'shared')
      AND expires_at IS NOT NULL 
      AND expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### Generated Reports

```sql
-- Generated report tracking
CREATE TABLE tco_core.generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associated session
    session_id UUID NOT NULL REFERENCES tco_core.calculation_sessions(id) ON DELETE CASCADE,
    
    -- Report details
    report_type VARCHAR(20) NOT NULL, -- 'pdf', 'excel', 'csv'
    report_format VARCHAR(50) NOT NULL, -- 'standard', 'detailed', 'executive_summary'
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Storage information
    storage_provider VARCHAR(50) NOT NULL, -- 's3', 'gcs', 'azure', 'local'
    storage_path TEXT NOT NULL,
    storage_region VARCHAR(50),
    
    -- Report configuration
    report_config JSONB,
    /* Example report configuration:
    {
      "template": "standard_branded",
      "include_charts": true,
      "include_detailed_breakdown": true,
      "branding": {
        "logo_url": "https://example.com/logo.png",
        "company_name": "ACME Cooling Solutions",
        "contact_info": "sales@acme.com"
      },
      "customizations": {
        "executive_summary": true,
        "technical_appendix": false,
        "sensitivity_analysis": true
      }
    }
    */
    
    -- Access tracking
    download_count INTEGER NOT NULL DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    download_token VARCHAR(64) UNIQUE, -- For secure download links
    
    -- Lifecycle
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'generating', -- 'generating', 'ready', 'error', 'expired'
    error_message TEXT,
    
    -- Constraints
    CONSTRAINT valid_report_type CHECK (report_type IN ('pdf', 'excel', 'csv')),
    CONSTRAINT valid_status CHECK (status IN ('generating', 'ready', 'error', 'expired')),
    CONSTRAINT valid_storage CHECK (storage_provider IN ('s3', 'gcs', 'azure', 'local'))
);

-- Indexes
CREATE INDEX idx_generated_reports_session 
ON tco_core.generated_reports(session_id, created_at DESC);

CREATE INDEX idx_generated_reports_expires 
ON tco_core.generated_reports(expires_at) 
WHERE status = 'ready';

CREATE INDEX idx_generated_reports_download_token 
ON tco_core.generated_reports(download_token) 
WHERE download_token IS NOT NULL AND status = 'ready';
```

## Audit and Logging Tables

### Configuration Audit Trail

```sql
-- Comprehensive audit trail for all configuration changes
CREATE TABLE tco_audit.configuration_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What was changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[], -- Array of changed field names
    
    -- Who and when
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    session_id VARCHAR(100), -- Database session ID
    application_name VARCHAR(100),
    
    -- Context
    change_reason TEXT,
    approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- IP and user agent for web changes
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT valid_operation CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    CONSTRAINT valid_approval CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- Partitioning by month
CREATE TABLE tco_audit.configuration_audit_y2025m08 
PARTITION OF tco_audit.configuration_audit
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- Indexes for audit queries
CREATE INDEX idx_config_audit_table_record 
ON tco_audit.configuration_audit(table_name, record_id, changed_at DESC);

CREATE INDEX idx_config_audit_user_date 
ON tco_audit.configuration_audit(changed_by, changed_at DESC);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_configuration_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_row tco_audit.configuration_audit%ROWTYPE;
    changed_fields TEXT[];
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Skip audit table itself
    IF TG_TABLE_SCHEMA = 'tco_audit' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;
    
    -- Initialize audit record
    audit_row.id = gen_random_uuid();
    audit_row.table_name = TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;
    audit_row.operation = TG_OP;
    audit_row.changed_by = COALESCE(current_setting('app.current_user', true), session_user);
    audit_row.changed_at = NOW();
    audit_row.session_id = pg_backend_pid()::text;
    
    IF TG_OP = 'DELETE' THEN
        audit_row.record_id = OLD.id;
        audit_row.old_values = to_jsonb(OLD);
        
    ELSIF TG_OP = 'INSERT' THEN
        audit_row.record_id = NEW.id;
        audit_row.new_values = to_jsonb(NEW);
        
    ELSIF TG_OP = 'UPDATE' THEN
        audit_row.record_id = NEW.id;
        audit_row.old_values = to_jsonb(OLD);
        audit_row.new_values = to_jsonb(NEW);
        
        -- Identify changed fields
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
        
        audit_row.changed_fields = changed_fields;
    END IF;
    
    -- Insert audit record
    INSERT INTO tco_audit.configuration_audit SELECT audit_row.*;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Audit trigger failed: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to configuration tables
CREATE TRIGGER trigger_audit_equipment_config
AFTER INSERT OR UPDATE OR DELETE ON tco_config.equipment_configurations
FOR EACH ROW EXECUTE FUNCTION audit_configuration_changes();

CREATE TRIGGER trigger_audit_financial_params
AFTER INSERT OR UPDATE OR DELETE ON tco_config.financial_parameters
FOR EACH ROW EXECUTE FUNCTION audit_configuration_changes();
```

### System Usage Analytics

```sql
-- Usage analytics and metrics
CREATE TABLE tco_audit.usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    event_type VARCHAR(50) NOT NULL, -- 'calculation', 'report_generation', 'config_view'
    event_subtype VARCHAR(50), -- 'pdf_export', 'excel_export', 'share_link'
    
    -- Session and user context
    session_id UUID REFERENCES tco_core.calculation_sessions(id),
    ip_address INET NOT NULL,
    user_agent TEXT,
    referer_url TEXT,
    
    -- Geographic data
    country_code VARCHAR(2),
    region_code VARCHAR(10),
    city VARCHAR(100),
    
    -- Event data
    event_data JSONB,
    /* Example event data:
    {
      "calculation_type": "standard",
      "currency": "USD",
      "locale": "en",
      "air_cooling_racks": 100,
      "immersion_cooling_tanks": 55,
      "analysis_years": 5,
      "total_savings": 575000.00,
      "processing_time_ms": 850
    }
    */
    
    -- Performance metrics
    processing_time_ms INTEGER,
    response_size_bytes INTEGER,
    
    -- Temporal data
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'page_view', 'calculation', 'report_generation', 'config_change', 
        'error', 'performance', 'share_link_access'
    ))
);

-- Partitioning by month for performance
CREATE TABLE tco_audit.usage_analytics_y2025m08 
PARTITION OF tco_audit.usage_analytics
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- Indexes for analytics queries
CREATE INDEX idx_usage_analytics_event_time 
ON tco_audit.usage_analytics(event_type, event_timestamp DESC);

CREATE INDEX idx_usage_analytics_session 
ON tco_audit.usage_analytics(session_id, event_timestamp DESC);

CREATE INDEX idx_usage_analytics_geography 
ON tco_audit.usage_analytics(country_code, region_code, event_timestamp DESC);
```

## Materialized Views for Performance

### Current Configuration View

```sql
-- Materialized view for current active configurations
CREATE MATERIALIZED VIEW tco_config.current_equipment_pricing AS
SELECT DISTINCT ON (category, subcategory, item_code)
    id,
    category,
    subcategory,
    item_code,
    display_name,
    specifications,
    base_pricing,
    regional_adjustments,
    effective_date,
    version
FROM tco_config.equipment_configurations
WHERE status = 'active' 
  AND (expiry_date IS NULL OR expiry_date > NOW())
  AND effective_date <= NOW()
ORDER BY category, subcategory, item_code, effective_date DESC;

-- Unique index for fast lookups
CREATE UNIQUE INDEX idx_current_equipment_pricing_lookup
ON tco_config.current_equipment_pricing(category, subcategory, item_code);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_current_pricing()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tco_config.current_equipment_pricing;
END;
$$ LANGUAGE plpgsql;

-- Schedule regular refresh (requires pg_cron extension)
SELECT cron.schedule('refresh-pricing', '0 1 * * *', 'SELECT refresh_current_pricing();');
```

### Usage Summary View

```sql
-- Materialized view for usage analytics summary
CREATE MATERIALIZED VIEW tco_audit.usage_summary_daily AS
SELECT 
    DATE(event_timestamp) as usage_date,
    event_type,
    country_code,
    COUNT(*) as event_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(processing_time_ms) as avg_processing_time,
    SUM(response_size_bytes) as total_response_bytes,
    
    -- Calculation-specific metrics
    COUNT(*) FILTER (WHERE event_type = 'calculation') as total_calculations,
    AVG((event_data->>'total_savings')::numeric) FILTER (WHERE event_type = 'calculation') as avg_savings,
    COUNT(DISTINCT event_data->>'currency') FILTER (WHERE event_type = 'calculation') as currencies_used,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
FROM tco_audit.usage_analytics
GROUP BY DATE(event_timestamp), event_type, country_code;

-- Indexes for the summary view
CREATE INDEX idx_usage_summary_date_type 
ON tco_audit.usage_summary_daily(usage_date DESC, event_type);
```

## Data Migration and Seeding

### Initial Configuration Data

```sql
-- Insert sample equipment configurations
INSERT INTO tco_config.equipment_configurations 
(category, subcategory, item_code, display_name, specifications, base_pricing) VALUES

-- Air Cooling Equipment
('air_cooling', 'rack', '42U_STANDARD', 
 '{"en": "42U Standard Server Rack", "ar": "رف خادم قياسي 42 وحدة"}',
 '{
   "physical": {"height_units": 42, "width_mm": 600, "depth_mm": 1000, "weight_kg": 85},
   "electrical": {"power_capacity_kw": 15, "power_consumption_kw": 0.5},
   "thermal": {"heat_dissipation_kw": 15, "cooling_airflow_cfm": 500}
 }',
 '{
   "USD": {"equipment_cost": 2500, "installation_cost": 1000, "maintenance_annual_pct": 0.05},
   "EUR": {"equipment_cost": 2100, "installation_cost": 840, "maintenance_annual_pct": 0.05},
   "SAR": {"equipment_cost": 9375, "installation_cost": 3750, "maintenance_annual_pct": 0.05},
   "AED": {"equipment_cost": 9188, "installation_cost": 3675, "maintenance_annual_pct": 0.05}
 }'
),

-- HVAC System
('air_cooling', 'hvac', 'CRAC_30KW',
 '{"en": "30kW CRAC Unit", "ar": "وحدة تكييف دقيق 30 كيلوواط"}',
 '{
   "cooling_capacity_kw": 30,
   "power_consumption_kw": 12,
   "efficiency_cop": 2.5,
   "airflow_cfm": 6000
 }',
 '{
   "USD": {"equipment_cost": 25000, "installation_cost": 8000, "maintenance_annual_pct": 0.08},
   "EUR": {"equipment_cost": 21000, "installation_cost": 6720, "maintenance_annual_pct": 0.08}
 }'
),

-- Immersion Cooling Equipment
('immersion_cooling', 'tank', 'IMMERSION_TANK_23U',
 '{"en": "23U Immersion Cooling Tank", "ar": "خزان التبريد بالغمر 23 وحدة"}',
 '{
   "physical": {"height_units": 23, "server_capacity": 48, "coolant_volume_liters": 500},
   "thermal": {"cooling_capacity_kw": 96, "power_density_kw_per_u": 4.2},
   "efficiency": {"pue": 1.03, "pump_efficiency": 0.92}
 }',
 '{
   "USD": {"equipment_cost": 35000, "installation_cost": 8000, "maintenance_annual_pct": 0.03},
   "EUR": {"equipment_cost": 29400, "installation_cost": 6720, "maintenance_annual_pct": 0.03}
 }'
);

-- Insert financial parameters
INSERT INTO tco_config.financial_parameters 
(parameter_category, parameter_name, parameter_code, default_value, currency_code, unit, description) VALUES
('discount_rates', 'Corporate Discount Rate', 'discount_rate_corporate', 0.08, NULL, 'decimal',
 '{"en": "Standard corporate discount rate for NPV calculations", "ar": "معدل الخصم الشركاتي لحسابات صافي القيمة الحالية"}'),
('energy_costs', 'US Industrial Rate', 'energy_rate_us_industrial', 0.12, 'USD', 'per_kwh',
 '{"en": "US average industrial electricity rate", "ar": "متوسط سعر الكهرباء الصناعية في أمريكا"}'),
('energy_costs', 'EU Industrial Rate', 'energy_rate_eu_industrial', 0.28, 'EUR', 'per_kwh',
 '{"en": "EU average industrial electricity rate", "ar": "متوسط سعر الكهرباء الصناعية في أوروبا"}'),
('escalation_rates', 'Energy Cost Escalation', 'escalation_energy', 0.03, NULL, 'decimal',
 '{"en": "Annual energy cost escalation rate", "ar": "معدل تصاعد تكلفة الطاقة السنوي"}');

-- Insert initial exchange rates
INSERT INTO tco_config.exchange_rates (from_currency, to_currency, rate, source, effective_date) VALUES
('USD', 'EUR', 0.85, 'manual', CURRENT_DATE),
('USD', 'SAR', 3.75, 'manual', CURRENT_DATE),
('USD', 'AED', 3.67, 'manual', CURRENT_DATE),
('EUR', 'USD', 1.18, 'manual', CURRENT_DATE),
('SAR', 'USD', 0.27, 'manual', CURRENT_DATE),
('AED', 'USD', 0.27, 'manual', CURRENT_DATE);
```

## Database Performance Optimization

### Index Strategy

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_equipment_config_lookup_active 
ON tco_config.equipment_configurations(category, subcategory, status, effective_date DESC)
WHERE status = 'active';

-- Partial indexes for frequently filtered data
CREATE INDEX idx_calculation_sessions_active_recent 
ON tco_core.calculation_sessions(created_at DESC, currency, locale)
WHERE status = 'active' AND created_at > NOW() - INTERVAL '30 days';

-- GIN indexes for JSON queries
CREATE INDEX idx_equipment_config_specs_gin 
ON tco_config.equipment_configurations USING gin(specifications);

CREATE INDEX idx_financial_params_regional_gin 
ON tco_config.financial_parameters USING gin(regional_values);

-- Expression indexes for common calculations
CREATE INDEX idx_calculation_total_savings 
ON tco_core.calculation_sessions(((results->'summary'->>'total_tco_savings_5yr')::numeric))
WHERE results IS NOT NULL;
```

### Connection Pooling Configuration

```sql
-- Connection pooling settings (postgresql.conf)
-- max_connections = 200
-- shared_buffers = 4GB
-- effective_cache_size = 12GB
-- maintenance_work_mem = 512MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
-- random_page_cost = 1.1  -- For SSD storage
-- effective_io_concurrency = 200

-- Connection pooling function for application
CREATE OR REPLACE FUNCTION get_pool_stats()
RETURNS TABLE (
    database_name TEXT,
    active_connections INTEGER,
    idle_connections INTEGER,
    total_connections INTEGER,
    max_connections INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        datname::TEXT as database_name,
        COUNT(*) FILTER (WHERE state = 'active')::INTEGER as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle')::INTEGER as idle_connections,
        COUNT(*)::INTEGER as total_connections,
        (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') as max_connections
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY datname;
END;
$$ LANGUAGE plpgsql;
```

This comprehensive database schema provides a robust foundation for the Immersion Cooling TCO Calculator, supporting all functional requirements while ensuring data integrity, performance, and scalability for future growth.