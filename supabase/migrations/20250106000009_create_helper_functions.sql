-- Helper functions for authentication and authorization

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_id UUID)
RETURNS TABLE(
  organization_id UUID,
  organization_name TEXT,
  user_role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    om.role as user_role,
    om.joined_at
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.profile_id = user_id
  ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is organization admin
CREATE OR REPLACE FUNCTION is_org_admin(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE profile_id = user_id 
      AND organization_id = org_id 
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(user_id UUID, proj_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM project_members 
    WHERE profile_id = user_id 
      AND project_id = proj_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user's effective role in a project
CREATE OR REPLACE FUNCTION get_project_role(user_id UUID, proj_id UUID)
RETURNS TEXT AS $$
DECLARE
  org_role TEXT;
  proj_role TEXT;
BEGIN
  -- Get organization role
  SELECT om.role INTO org_role
  FROM organization_members om
  JOIN projects p ON p.organization_id = om.organization_id
  WHERE om.profile_id = user_id AND p.id = proj_id;
  
  -- Get project role
  SELECT role INTO proj_role
  FROM project_members
  WHERE profile_id = user_id AND project_id = proj_id;
  
  -- Return the highest privilege role
  IF org_role = 'admin' THEN
    RETURN 'org_admin';
  ELSIF proj_role = 'admin' THEN
    RETURN 'project_admin';
  ELSIF proj_role IS NOT NULL THEN
    RETURN proj_role;
  ELSIF org_role IS NOT NULL THEN
    RETURN 'viewer';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT, user_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  organization_id UUID
) AS $$
DECLARE
  inv RECORD;
  org_id UUID;
BEGIN
  -- Find the invitation
  SELECT * INTO inv
  FROM invitations
  WHERE token = invitation_token
    AND accepted_at IS NULL
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired invitation', NULL::UUID;
    RETURN;
  END IF;
  
  -- Add user to organization
  INSERT INTO organization_members (organization_id, profile_id, role)
  VALUES (inv.organization_id, user_id, inv.role)
  ON CONFLICT (organization_id, profile_id) DO UPDATE
  SET role = EXCLUDED.role;
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = NOW()
  WHERE id = inv.id;
  
  org_id := inv.organization_id;
  
  RETURN QUERY SELECT TRUE, 'Invitation accepted successfully', org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get project statistics for a user
CREATE OR REPLACE FUNCTION get_user_project_stats(user_id UUID)
RETURNS TABLE(
  total_projects BIGINT,
  total_tasks BIGINT,
  assigned_tasks BIGINT,
  completed_tasks BIGINT,
  organizations_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.assignee_id = user_id THEN t.id END) as assigned_tasks,
    COUNT(DISTINCT CASE WHEN t.assignee_id = user_id AND t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT om.organization_id) as organizations_count
  FROM organization_members om
  LEFT JOIN projects p ON p.organization_id = om.organization_id
  LEFT JOIN tasks t ON t.project_id = p.id
  WHERE om.profile_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_project_member TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_role TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_project_stats TO authenticated;