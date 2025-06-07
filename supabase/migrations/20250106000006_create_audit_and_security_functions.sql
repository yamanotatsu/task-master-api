-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Create organization cleanup function
CREATE OR REPLACE FUNCTION cleanup_organization_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Projects, tasks etc. are cascade deleted via foreign keys
  -- Log the deletion for audit purposes
  INSERT INTO audit_logs (action, table_name, record_id, user_id, old_values)
  VALUES (
    'DELETE', 
    'organizations', 
    OLD.id, 
    auth.uid(),
    to_jsonb(OLD)
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for organization deletion
CREATE TRIGGER on_organization_delete
  BEFORE DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION cleanup_organization_data();

-- Create security views
CREATE OR REPLACE VIEW user_organizations AS
SELECT 
  o.*,
  om.role,
  om.joined_at
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.profile_id = auth.uid();

CREATE OR REPLACE VIEW user_accessible_projects AS
SELECT DISTINCT
  p.*,
  CASE 
    WHEN om.role = 'admin' THEN 'org_admin'
    WHEN pm.role = 'admin' THEN 'project_admin'
    WHEN pm.role IS NOT NULL THEN pm.role
    ELSE 'viewer'
  END as effective_role
FROM projects p
JOIN organization_members om ON p.organization_id = om.organization_id
LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.profile_id = auth.uid()
WHERE om.profile_id = auth.uid();

-- Comment on views
COMMENT ON VIEW user_organizations IS 'Organizations accessible to the current user';
COMMENT ON VIEW user_accessible_projects IS 'Projects accessible to the current user with their effective role';