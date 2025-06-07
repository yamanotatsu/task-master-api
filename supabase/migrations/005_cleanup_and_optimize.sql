-- Create composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organization_members_org_profile 
  ON organization_members(organization_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_projects_org_created 
  ON projects(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
  ON tasks(project_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status 
  ON tasks(assignee_id, status) 
  WHERE assignee_id IS NOT NULL;

-- Create view for user's accessible projects with member count
CREATE OR REPLACE VIEW user_projects_view AS
SELECT 
  p.*,
  o.name as organization_name,
  om.role as user_role,
  COUNT(DISTINCT om2.profile_id) as member_count
FROM projects p
JOIN organizations o ON o.id = p.organization_id
JOIN organization_members om ON om.organization_id = p.organization_id AND om.profile_id = auth.uid()
LEFT JOIN organization_members om2 ON om2.organization_id = p.organization_id
GROUP BY p.id, o.name, om.role;

-- Create view for task assignments
CREATE OR REPLACE VIEW user_assigned_tasks_view AS
SELECT 
  t.*,
  p.name as project_name,
  p.organization_id,
  pr.full_name as assignee_name
FROM tasks t
JOIN projects p ON p.id = t.project_id
LEFT JOIN profiles pr ON pr.id = t.assignee_id
WHERE EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.organization_id = p.organization_id
  AND om.profile_id = auth.uid()
);

-- Add missing foreign key constraints if they don't exist
DO $$
BEGIN
  -- Check and add foreign key for sessions.project_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sessions_project_id_fkey'
  ) THEN
    ALTER TABLE sessions 
    ADD CONSTRAINT sessions_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Grant necessary permissions for RLS functions
GRANT EXECUTE ON FUNCTION is_organization_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_organization_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organizations(uuid) TO authenticated;

-- Create notification for future implementation
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_notifications_profile_unread 
  ON notifications(profile_id, created_at DESC) 
  WHERE read_at IS NULL;

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (profile_id = auth.uid());

-- Analytics helper function (for future dashboard features)
CREATE OR REPLACE FUNCTION get_organization_stats(org_id uuid)
RETURNS TABLE (
  total_projects bigint,
  total_tasks bigint,
  completed_tasks bigint,
  total_members bigint,
  active_members bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('completed', 'done')) as completed_tasks,
    COUNT(DISTINCT om.profile_id) as total_members,
    COUNT(DISTINCT t.assignee_id) as active_members
  FROM organizations o
  LEFT JOIN projects p ON p.organization_id = o.id
  LEFT JOIN tasks t ON t.project_id = p.id
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE o.id = org_id
  AND is_organization_member(org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;