-- Initial database schema for TCO Calculator
-- Based on the comprehensive schema design in architecture documentation

-- Create schemas for organization
CREATE SCHEMA IF NOT EXISTS tco_core;
CREATE SCHEMA IF NOT EXISTS tco_config;
CREATE SCHEMA IF NOT EXISTS tco_audit;
CREATE SCHEMA IF NOT EXISTS tco_temp;

-- Set search path
SET search_path = tco_core, tco_config, tco_audit, tco_temp, public;

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Equipment configurations table
CREATE TABLE tco_config.equipment_configurations (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL CHECK (category IN ('air_cooling', 'immersion_cooling')),
    subcategory VARCHAR(50) NOT NULL CHECK (subcategory IN ('rack', 'hvac', 'tank', 'pump', 'coolant', 'infrastructure')),
    item_code VARCHAR(50) NOT NULL,
    
    -- Descriptive information
    display_name JSONB NOT NULL,
    description JSONB,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    
    -- Technical specifications (flexible JSON structure)
    specifications JSONB NOT NULL DEFAULT '{}',
    
    -- Multi-currency pricing
    base_pricing JSONB NOT NULL DEFAULT '{}',
    
    -- Regional variations
    regional_adjustments JSONB DEFAULT '{}',
    
    -- Lifecycle and versioning
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'discontinued')),
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_version CHECK (version > 0),
    CONSTRAINT valid_effective_date CHECK (expiry_date IS NULL OR effective_date < expiry_date),
    
    -- Unique constraint for active items
    UNIQUE (category, subcategory, item_code, version)
);

-- Financial parameters table
CREATE TABLE tco_config.financial_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parameter identification
    parameter_category VARCHAR(50) NOT NULL CHECK (parameter_category IN ('discount_rates', 'energy_costs', 'labor_costs', 'escalation_rates')),
    parameter_name VARCHAR(100) NOT NULL,
    parameter_code VARCHAR(50) NOT NULL,
    
    -- Value and currency
    default_value DECIMAL(15,6) NOT NULL,
    currency_code VARCHAR(3) CHECK (currency_code IS NULL OR currency_code IN ('USD', 'EUR', 'SAR', 'AED')),
    unit VARCHAR(20),
    
    -- Regional variations
    regional_values JSONB DEFAULT '{}',
    
    -- Validation ranges
    min_value DECIMAL(15,6),
    max_value DECIMAL(15,6),
    validation_rules JSONB,
    
    -- Metadata
    description JSONB,
    source VARCHAR(200),
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
    last_updated_source TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
    
    -- Audit fields
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_value_range CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value),
    
    UNIQUE (parameter_code, effective_date)
);

-- Exchange rates table
CREATE TABLE tco_config.exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Currency pair
    from_currency VARCHAR(3) NOT NULL CHECK (from_currency IN ('USD', 'EUR', 'SAR', 'AED')),
    to_currency VARCHAR(3) NOT NULL CHECK (to_currency IN ('USD', 'EUR', 'SAR', 'AED')),
    
    -- Exchange rate data
    rate DECIMAL(12,6) NOT NULL CHECK (rate > 0),
    inverse_rate DECIMAL(12,6) GENERATED ALWAYS AS (1.0 / rate) STORED,
    
    -- Rate metadata
    source VARCHAR(50) NOT NULL,
    rate_type VARCHAR(20) NOT NULL DEFAULT 'spot' CHECK (rate_type IN ('spot', 'forward', 'average')),
    confidence_score DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    
    -- Temporal data
    effective_date DATE NOT NULL,
    effective_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_currency_pair CHECK (from_currency != to_currency),
    
    UNIQUE (from_currency, to_currency, effective_date, source)
);

-- Calculation sessions table (partitioned by month for performance)
CREATE TABLE tco_core.calculation_sessions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(64) UNIQUE NOT NULL,
    
    -- Input configuration
    configuration JSONB NOT NULL,
    
    -- Calculation results
    results JSONB,
    
    -- Metadata
    locale VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ar')),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'SAR', 'AED')),
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
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'shared', 'expired', 'archived')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    access_count INTEGER NOT NULL DEFAULT 0,
    
    -- Full-text search
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(configuration->>'description', '') || ' ' ||
            COALESCE(configuration->>'tags', '') || ' ' ||
            COALESCE(configuration->'financial'->>'region', '')
        )
    ) STORED,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for current and next year
CREATE TABLE tco_core.calculation_sessions_y2025 PARTITION OF tco_core.calculation_sessions
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE tco_core.calculation_sessions_y2026 PARTITION OF tco_core.calculation_sessions
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Generated reports table
CREATE TABLE tco_core.generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Associated session
    session_id UUID NOT NULL REFERENCES tco_core.calculation_sessions(id) ON DELETE CASCADE,
    
    -- Report details
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('pdf', 'excel', 'csv')),
    report_format VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Storage information
    storage_provider VARCHAR(50) NOT NULL CHECK (storage_provider IN ('s3', 'gcs', 'azure', 'local')),
    storage_path TEXT NOT NULL,
    storage_region VARCHAR(50),
    
    -- Report configuration
    report_config JSONB,
    
    -- Access tracking
    download_count INTEGER NOT NULL DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    download_token VARCHAR(64) UNIQUE,
    
    -- Lifecycle
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'error', 'expired')),
    error_message TEXT
);

-- Configuration audit trail table (partitioned by month)
CREATE TABLE tco_audit.configuration_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What was changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Who and when
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    session_id VARCHAR(100),
    application_name VARCHAR(100),
    
    -- Context
    change_reason TEXT,
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- IP and user agent for web changes
    ip_address INET,
    user_agent TEXT
) PARTITION BY RANGE (changed_at);

-- Create audit partition for current year
CREATE TABLE tco_audit.configuration_audit_y2025 PARTITION OF tco_audit.configuration_audit
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Usage analytics table (partitioned by month)
CREATE TABLE tco_audit.usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'page_view', 'calculation', 'report_generation', 'config_change', 
        'error', 'performance', 'share_link_access'
    )),
    event_subtype VARCHAR(50),
    
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
    
    -- Performance metrics
    processing_time_ms INTEGER,
    response_size_bytes INTEGER,
    
    -- Temporal data
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (event_timestamp);

-- Create analytics partition for current year
CREATE TABLE tco_audit.usage_analytics_y2025 PARTITION OF tco_audit.usage_analytics
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Create indexes for performance
CREATE INDEX idx_equipment_config_category_active 
ON tco_config.equipment_configurations(category, subcategory, effective_date DESC) 
WHERE status = 'active' AND (expiry_date IS NULL OR expiry_date > NOW());

CREATE INDEX idx_equipment_config_search 
ON tco_config.equipment_configurations 
USING gin(to_tsvector('english', item_code || ' ' || COALESCE(manufacturer, '') || ' ' || COALESCE(model, '')));

CREATE INDEX idx_financial_config_lookup 
ON tco_config.financial_parameters (parameter_code, currency_code, effective_date DESC)
WHERE status = 'active';

CREATE INDEX idx_exchange_rates_lookup 
ON tco_config.exchange_rates(from_currency, to_currency, effective_date DESC);

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

CREATE INDEX idx_generated_reports_session 
ON tco_core.generated_reports(session_id, created_at DESC);

CREATE INDEX idx_generated_reports_expires 
ON tco_core.generated_reports(expires_at) 
WHERE status = 'ready';

CREATE INDEX idx_config_audit_table_record 
ON tco_audit.configuration_audit(table_name, record_id, changed_at DESC);

CREATE INDEX idx_usage_analytics_event_time 
ON tco_audit.usage_analytics(event_type, event_timestamp DESC);

-- Create materialized view for current active configurations
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

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_current_equipment_pricing_lookup
ON tco_config.current_equipment_pricing(category, subcategory, item_code);

-- Create function to refresh current pricing
CREATE OR REPLACE FUNCTION refresh_current_pricing()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tco_config.current_equipment_pricing;
END;
$$ LANGUAGE plpgsql;

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER trigger_equipment_config_updated 
BEFORE UPDATE ON tco_config.equipment_configurations
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trigger_financial_params_updated
BEFORE UPDATE ON tco_config.financial_parameters
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_configuration_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_row tco_audit.configuration_audit%ROWTYPE;
    changed_fields TEXT[];
BEGIN
    -- Skip audit table itself
    IF TG_TABLE_SCHEMA = 'tco_audit' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;
    
    -- Initialize audit record
    audit_row.id = uuid_generate_v4();
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

-- Function to cleanup expired sessions
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

-- Function to get exchange rate
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(12,6) AS $$
DECLARE
    v_rate DECIMAL(12,6);
BEGIN
    -- Same currency case
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;
    
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
    
    RETURN COALESCE(v_rate, 1.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get pool stats
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

-- Create initial admin user table (simple for now)
CREATE TABLE tco_core.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    permissions TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger for admin users
CREATE TRIGGER trigger_admin_users_updated 
BEFORE UPDATE ON tco_core.admin_users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();