-- Security Tables Migration
-- This migration creates tables for rate limiting, brute force protection, and security monitoring

-- Create login_attempts table for tracking authentication attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL, -- Can be email, username, or IP
  identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('email', 'username', 'ip')),
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cleared BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for login_attempts
CREATE INDEX idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX idx_login_attempts_identifier_type ON login_attempts(identifier_type);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);
CREATE INDEX idx_login_attempts_success ON login_attempts(success);
CREATE INDEX idx_login_attempts_cleared ON login_attempts(cleared);

-- Create account_locks table for managing account lockouts
CREATE TABLE IF NOT EXISTS account_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('email', 'username', 'user_id')),
  reason TEXT NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  locked_by VARCHAR(255) -- Admin user ID if manually locked
);

-- Create indexes for account_locks
CREATE INDEX idx_account_locks_identifier ON account_locks(identifier);
CREATE INDEX idx_account_locks_active ON account_locks(is_active);
CREATE INDEX idx_account_locks_expires ON account_locks(expires_at);

-- Create security_blocks table for IP and identifier blocking
CREATE TABLE IF NOT EXISTS security_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL, -- IP address, email, etc.
  identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('ip', 'email', 'user_id', 'fingerprint')),
  reason TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  blocked_by VARCHAR(255), -- Admin user ID if manually blocked
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for security_blocks
CREATE INDEX idx_security_blocks_identifier ON security_blocks(identifier);
CREATE INDEX idx_security_blocks_type ON security_blocks(identifier_type);
CREATE INDEX idx_security_blocks_active ON security_blocks(is_active);
CREATE INDEX idx_security_blocks_expires ON security_blocks(expires_at);

-- Create security_alerts table for tracking suspicious activities
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(255),
  action_taken TEXT
);

-- Create indexes for security_alerts
CREATE INDEX idx_security_alerts_identifier ON security_alerts(identifier);
CREATE INDEX idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX idx_security_alerts_created ON security_alerts(created_at);
CREATE INDEX idx_security_alerts_reviewed ON security_alerts(reviewed);

-- Create rate_limit_overrides table for custom rate limits
CREATE TABLE IF NOT EXISTS rate_limit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('ip', 'user_id', 'api_key')),
  endpoint_pattern VARCHAR(255), -- Specific endpoint or pattern, null for global
  max_requests INTEGER NOT NULL,
  window_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255),
  UNIQUE(identifier, identifier_type, endpoint_pattern)
);

-- Create indexes for rate_limit_overrides
CREATE INDEX idx_rate_limit_overrides_identifier ON rate_limit_overrides(identifier);
CREATE INDEX idx_rate_limit_overrides_active ON rate_limit_overrides(is_active);

-- Create captcha_challenges table for tracking CAPTCHA requirements
CREATE TABLE IF NOT EXISTS captcha_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('ip', 'email', 'session')),
  challenge_token VARCHAR(255) UNIQUE NOT NULL,
  challenge_type VARCHAR(50) DEFAULT 'recaptcha',
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0
);

-- Create indexes for captcha_challenges
CREATE INDEX idx_captcha_challenges_identifier ON captcha_challenges(identifier);
CREATE INDEX idx_captcha_challenges_token ON captcha_challenges(challenge_token);
CREATE INDEX idx_captcha_challenges_expires ON captcha_challenges(expires_at);

-- Create functions for cleanup of old records

-- Function to clean up old login attempts
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts 
  WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND cleared = true;
  
  -- Archive suspicious patterns before deletion
  INSERT INTO security_alerts (identifier, alert_type, reason, metadata)
  SELECT 
    identifier,
    'archived_pattern',
    'Archived suspicious login pattern',
    jsonb_build_object(
      'attempt_count', COUNT(*),
      'date_range', jsonb_build_object(
        'start', MIN(attempted_at),
        'end', MAX(attempted_at)
      )
    )
  FROM login_attempts
  WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
  AND success = false
  GROUP BY identifier
  HAVING COUNT(*) > 50;
  
  -- Delete very old records
  DELETE FROM login_attempts 
  WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire blocks
CREATE OR REPLACE FUNCTION expire_security_blocks()
RETURNS void AS $$
BEGIN
  UPDATE security_blocks
  SET is_active = false
  WHERE is_active = true
  AND expires_at < CURRENT_TIMESTAMP;
  
  UPDATE account_locks
  SET is_active = false
  WHERE is_active = true
  AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create views for monitoring

-- View for active security threats
CREATE OR REPLACE VIEW active_security_threats AS
SELECT 
  'block' as threat_type,
  identifier,
  identifier_type,
  reason,
  severity,
  blocked_at as occurred_at,
  expires_at
FROM security_blocks
WHERE is_active = true
UNION ALL
SELECT 
  'lock' as threat_type,
  identifier,
  identifier_type,
  reason,
  'high' as severity,
  locked_at as occurred_at,
  expires_at
FROM account_locks
WHERE is_active = true;

-- View for login attempt statistics
CREATE OR REPLACE VIEW login_attempt_stats AS
SELECT 
  identifier,
  identifier_type,
  COUNT(*) FILTER (WHERE success = true) as successful_attempts,
  COUNT(*) FILTER (WHERE success = false) as failed_attempts,
  COUNT(*) as total_attempts,
  MAX(attempted_at) as last_attempt,
  COUNT(DISTINCT ip_address) as unique_ips
FROM login_attempts
WHERE attempted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY identifier, identifier_type;

-- Grant appropriate permissions
GRANT SELECT ON login_attempts TO authenticated;
GRANT SELECT ON active_security_threats TO authenticated;
GRANT SELECT ON login_attempt_stats TO authenticated;

-- Row Level Security policies
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage security tables
CREATE POLICY "Service role full access" ON login_attempts
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access" ON account_locks
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access" ON security_blocks
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access" ON security_alerts
  FOR ALL TO service_role USING (true);