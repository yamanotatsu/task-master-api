-- Enhanced Audit Logs Migration
-- Creates comprehensive audit logging tables with proper indexing and performance optimization

-- Create enhanced audit logs table
CREATE TABLE IF NOT EXISTS audit_logs_enhanced (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Event identification
  event_type TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT DEFAULT '',
  
  -- User and session context
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Resource information
  resource_type TEXT,
  resource_id UUID,
  
  -- Request/response details
  request_id TEXT,
  request_method TEXT,
  request_path TEXT,
  request_size INTEGER,
  response_status INTEGER,
  response_size INTEGER,
  duration_ms INTEGER,
  
  -- Network and location data
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  region TEXT,
  device_type TEXT,
  browser TEXT,
  
  -- Data changes
  old_values JSONB,
  new_values JSONB,
  affected_records INTEGER DEFAULT 1,
  
  -- Security and risk assessment
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  data_sensitivity TEXT DEFAULT 'internal' CHECK (data_sensitivity IN ('public', 'internal', 'confidential', 'restricted')),
  compliance_tags TEXT[] DEFAULT '{}',
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type ~ '^[a-z_]+\.[a-z_]+(\.[a-z_]+)?$'),
  CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT reasonable_duration CHECK (duration_ms IS NULL OR duration_ms >= 0),
  CONSTRAINT reasonable_size CHECK (
    (request_size IS NULL OR request_size >= 0) AND 
    (response_size IS NULL OR response_size >= 0)
  )
);

-- Create comprehensive indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_created_at 
  ON audit_logs_enhanced USING BTREE (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_user_id 
  ON audit_logs_enhanced USING BTREE (user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_organization_id 
  ON audit_logs_enhanced USING BTREE (organization_id) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_event_type 
  ON audit_logs_enhanced USING BTREE (event_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_action 
  ON audit_logs_enhanced USING BTREE (action);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_resource 
  ON audit_logs_enhanced USING BTREE (resource_type, resource_id) 
  WHERE resource_type IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_risk_level 
  ON audit_logs_enhanced USING BTREE (risk_level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_ip_address 
  ON audit_logs_enhanced USING BTREE (ip_address) 
  WHERE ip_address IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_request_path 
  ON audit_logs_enhanced USING BTREE (request_path) 
  WHERE request_path IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_session_id 
  ON audit_logs_enhanced USING BTREE (session_id) 
  WHERE session_id IS NOT NULL;

-- GIN indexes for array and JSONB columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_tags 
  ON audit_logs_enhanced USING GIN (tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_compliance_tags 
  ON audit_logs_enhanced USING GIN (compliance_tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_metadata 
  ON audit_logs_enhanced USING GIN (metadata);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_user_time 
  ON audit_logs_enhanced USING BTREE (user_id, created_at DESC) 
  WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_org_time 
  ON audit_logs_enhanced USING BTREE (organization_id, created_at DESC) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_event_time 
  ON audit_logs_enhanced USING BTREE (event_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_enhanced_risk_time 
  ON audit_logs_enhanced USING BTREE (risk_level, created_at DESC) 
  WHERE risk_level IN ('high', 'critical');

-- Create audit statistics table for performance optimization
CREATE TABLE IF NOT EXISTS audit_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date_period DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  
  -- Event counts by type
  total_events INTEGER DEFAULT 0,
  auth_events INTEGER DEFAULT 0,
  org_events INTEGER DEFAULT 0,
  project_events INTEGER DEFAULT 0,
  task_events INTEGER DEFAULT 0,
  security_events INTEGER DEFAULT 0,
  
  -- Risk level counts
  low_risk_events INTEGER DEFAULT 0,
  medium_risk_events INTEGER DEFAULT 0,
  high_risk_events INTEGER DEFAULT 0,
  critical_risk_events INTEGER DEFAULT 0,
  
  -- User activity
  unique_users INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  
  -- Response statistics
  avg_response_time_ms DECIMAL(10,2),
  error_rate DECIMAL(5,4),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, date_period, period_type)
);

-- Index for audit statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_statistics_org_period 
  ON audit_statistics USING BTREE (organization_id, period_type, date_period DESC);

-- Create function to get audit statistics
CREATE OR REPLACE FUNCTION get_audit_statistics(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  organization_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  total_events BIGINT,
  auth_events BIGINT,
  org_events BIGINT,
  project_events BIGINT,
  task_events BIGINT,
  security_events BIGINT,
  low_risk_events BIGINT,
  medium_risk_events BIGINT,
  high_risk_events BIGINT,
  critical_risk_events BIGINT,
  unique_users BIGINT,
  unique_ips BIGINT,
  avg_response_time_ms DECIMAL,
  error_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_type LIKE 'auth.%') as auth_events,
    COUNT(*) FILTER (WHERE event_type LIKE 'organization.%') as org_events,
    COUNT(*) FILTER (WHERE event_type LIKE 'project.%') as project_events,
    COUNT(*) FILTER (WHERE event_type LIKE 'task.%') as task_events,
    COUNT(*) FILTER (WHERE event_type LIKE 'security.%') as security_events,
    COUNT(*) FILTER (WHERE risk_level = 'low') as low_risk_events,
    COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_risk_events,
    COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_events,
    COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_risk_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    AVG(duration_ms) as avg_response_time_ms,
    (COUNT(*) FILTER (WHERE response_status >= 400)::DECIMAL / COUNT(*)::DECIMAL) as error_rate
  FROM audit_logs_enhanced
  WHERE created_at >= start_date 
    AND created_at <= end_date
    AND (organization_filter IS NULL OR organization_id = organization_filter);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Delete old audit logs
  DELETE FROM audit_logs_enhanced 
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up old statistics (keep longer than audit logs)
  DELETE FROM audit_statistics 
  WHERE date_period < (cutoff_date - INTERVAL '30 days')::DATE;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to aggregate daily statistics
CREATE OR REPLACE FUNCTION aggregate_daily_audit_statistics(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS VOID AS $$
DECLARE
  org_record RECORD;
BEGIN
  -- Process each organization
  FOR org_record IN 
    SELECT DISTINCT organization_id 
    FROM audit_logs_enhanced 
    WHERE DATE(created_at) = target_date 
      AND organization_id IS NOT NULL
  LOOP
    INSERT INTO audit_statistics (
      organization_id,
      date_period,
      period_type,
      total_events,
      auth_events,
      org_events,
      project_events,
      task_events,
      security_events,
      low_risk_events,
      medium_risk_events,
      high_risk_events,
      critical_risk_events,
      unique_users,
      unique_ips,
      avg_response_time_ms,
      error_rate
    )
    SELECT 
      org_record.organization_id,
      target_date,
      'daily',
      COUNT(*),
      COUNT(*) FILTER (WHERE event_type LIKE 'auth.%'),
      COUNT(*) FILTER (WHERE event_type LIKE 'organization.%'),
      COUNT(*) FILTER (WHERE event_type LIKE 'project.%'),
      COUNT(*) FILTER (WHERE event_type LIKE 'task.%'),
      COUNT(*) FILTER (WHERE event_type LIKE 'security.%'),
      COUNT(*) FILTER (WHERE risk_level = 'low'),
      COUNT(*) FILTER (WHERE risk_level = 'medium'),
      COUNT(*) FILTER (WHERE risk_level = 'high'),
      COUNT(*) FILTER (WHERE risk_level = 'critical'),
      COUNT(DISTINCT user_id),
      COUNT(DISTINCT ip_address),
      AVG(duration_ms),
      (COUNT(*) FILTER (WHERE response_status >= 400)::DECIMAL / COUNT(*)::DECIMAL)
    FROM audit_logs_enhanced
    WHERE DATE(created_at) = target_date
      AND organization_id = org_record.organization_id
    ON CONFLICT (organization_id, date_period, period_type) 
    DO UPDATE SET
      total_events = EXCLUDED.total_events,
      auth_events = EXCLUDED.auth_events,
      org_events = EXCLUDED.org_events,
      project_events = EXCLUDED.project_events,
      task_events = EXCLUDED.task_events,
      security_events = EXCLUDED.security_events,
      low_risk_events = EXCLUDED.low_risk_events,
      medium_risk_events = EXCLUDED.medium_risk_events,
      high_risk_events = EXCLUDED.high_risk_events,
      critical_risk_events = EXCLUDED.critical_risk_events,
      unique_users = EXCLUDED.unique_users,
      unique_ips = EXCLUDED.unique_ips,
      avg_response_time_ms = EXCLUDED.avg_response_time_ms,
      error_rate = EXCLUDED.error_rate,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for recent security events
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
  id,
  event_type,
  action,
  description,
  user_id,
  organization_id,
  ip_address,
  user_agent,
  risk_level,
  metadata,
  created_at
FROM audit_logs_enhanced
WHERE event_type LIKE 'security.%' 
  OR risk_level IN ('high', 'critical')
  OR response_status IN (401, 403, 429)
ORDER BY created_at DESC
LIMIT 1000;

-- Create view for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  user_id,
  organization_id,
  COUNT(*) as total_actions,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  COUNT(*) FILTER (WHERE event_type LIKE 'auth.%') as auth_events,
  COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical')) as high_risk_events,
  MAX(created_at) as last_activity,
  COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs_enhanced
WHERE user_id IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, organization_id;

-- Create partitioning function for large datasets (optional optimization)
CREATE OR REPLACE FUNCTION create_audit_log_partition(start_date DATE, end_date DATE)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  start_str TEXT;
  end_str TEXT;
BEGIN
  start_str := TO_CHAR(start_date, 'YYYY_MM_DD');
  end_str := TO_CHAR(end_date, 'YYYY_MM_DD');
  partition_name := 'audit_logs_enhanced_' || start_str || '_to_' || end_str;
  
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_enhanced
    FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
  
  -- Create indexes on the partition
  EXECUTE format('
    CREATE INDEX CONCURRENTLY IF NOT EXISTS %I_created_at_idx 
    ON %I USING BTREE (created_at DESC)',
    partition_name, partition_name
  );
  
  EXECUTE format('
    CREATE INDEX CONCURRENTLY IF NOT EXISTS %I_user_id_idx 
    ON %I USING BTREE (user_id) WHERE user_id IS NOT NULL',
    partition_name, partition_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security policies
ALTER TABLE audit_logs_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_statistics ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own audit logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs_enhanced
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Policy for organization admins to see org audit logs
CREATE POLICY "Organization admins can view org audit logs" ON audit_logs_enhanced
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.profile_id = auth.uid() 
        AND om.role = 'admin'
    )
  );

-- Policy for audit statistics (organization admins only)
CREATE POLICY "Organization admins can view audit statistics" ON audit_statistics
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.profile_id = auth.uid() 
        AND om.role = 'admin'
    )
  );

-- Create trigger to automatically update statistics
CREATE OR REPLACE FUNCTION trigger_update_audit_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily statistics for the organization
  IF NEW.organization_id IS NOT NULL THEN
    PERFORM aggregate_daily_audit_statistics(DATE(NEW.created_at));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger is disabled by default to avoid performance impact
-- Uncomment to enable automatic statistics updates
-- CREATE TRIGGER update_audit_statistics_trigger
--   AFTER INSERT ON audit_logs_enhanced
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_update_audit_statistics();

-- Create scheduled job for daily statistics aggregation (using pg_cron if available)
-- This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('aggregate-audit-stats', '0 1 * * *', 'SELECT aggregate_daily_audit_statistics();');

-- Create scheduled job for cleanup (monthly)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 1 * *', 'SELECT cleanup_audit_logs(365);');

-- Comments for documentation
COMMENT ON TABLE audit_logs_enhanced IS 'Comprehensive audit logging table with security and compliance features';
COMMENT ON TABLE audit_statistics IS 'Pre-aggregated audit statistics for performance optimization';
COMMENT ON FUNCTION get_audit_statistics IS 'Retrieves audit statistics for a given time period and organization';
COMMENT ON FUNCTION cleanup_audit_logs IS 'Removes audit logs older than specified retention period';
COMMENT ON FUNCTION aggregate_daily_audit_statistics IS 'Aggregates daily audit statistics for performance optimization';
COMMENT ON VIEW recent_security_events IS 'View of recent security-related audit events';
COMMENT ON VIEW user_activity_summary IS 'Summary of user activity over the last 30 days';

-- Grant necessary permissions
GRANT SELECT ON audit_logs_enhanced TO authenticated;
GRANT SELECT ON audit_statistics TO authenticated;
GRANT SELECT ON recent_security_events TO authenticated;
GRANT SELECT ON user_activity_summary TO authenticated;