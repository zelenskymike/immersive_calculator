-- Database initialization script for TCO Calculator
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create application user with limited privileges
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles 
      WHERE rolname = 'tco_app_user'
   ) THEN
      CREATE ROLE tco_app_user WITH LOGIN PASSWORD 'app_user_password';
   END IF;
END
$do$;

-- Grant necessary privileges
GRANT CONNECT ON DATABASE tco_calculator TO tco_app_user;
GRANT CREATE ON SCHEMA public TO tco_app_user;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    configuration JSONB NOT NULL,
    is_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS calculation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    configuration_id UUID REFERENCES user_configurations(id) ON DELETE SET NULL,
    input_parameters JSONB NOT NULL,
    calculation_results JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_configurations_user_id ON user_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configurations_created_at ON user_configurations(created_at);
CREATE INDEX IF NOT EXISTS idx_calculation_results_user_id ON calculation_results(user_id);
CREATE INDEX IF NOT EXISTS idx_calculation_results_created_at ON calculation_results(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_configurations_updated_at 
    BEFORE UPDATE ON user_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant privileges to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tco_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tco_app_user;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO tco_app_user;

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.created_at as registered_at,
    u.last_login,
    COUNT(DISTINCT uc.id) as configuration_count,
    COUNT(DISTINCT cr.id) as calculation_count,
    MAX(cr.created_at) as last_calculation_at
FROM users u
LEFT JOIN user_configurations uc ON u.id = uc.user_id
LEFT JOIN calculation_results cr ON u.id = cr.user_id
GROUP BY u.id, u.name, u.email, u.created_at, u.last_login;

GRANT SELECT ON user_statistics TO tco_app_user;

-- Insert default admin user (password should be changed immediately)
INSERT INTO users (email, password_hash, name, role, email_verified)
VALUES (
    'admin@tco-calculator.com',
    '$2b$10$8K1p/a0dLN9wuDmEYfnFoukj8mNpIgCrb04XN8VrC4q23j45N.cCC', -- password: admin123
    'System Administrator',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for session management
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_session_token VARCHAR(255),
    p_expires_at TIMESTAMP WITH TIME ZONE,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Clean up expired sessions for this user
    DELETE FROM user_sessions 
    WHERE user_id = p_user_id AND expires_at < CURRENT_TIMESTAMP;
    
    -- Insert new session
    INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
    VALUES (p_user_id, p_session_token, p_expires_at, p_ip_address, p_user_agent)
    RETURNING id INTO session_id;
    
    -- Update user's last login
    UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = p_user_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO tco_app_user;
GRANT EXECUTE ON FUNCTION create_user_session(UUID, VARCHAR(255), TIMESTAMP WITH TIME ZONE, INET, TEXT) TO tco_app_user;