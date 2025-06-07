-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_organization_member(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND profile_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_organization_admin(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND profile_id = user_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_organizations(user_id uuid DEFAULT auth.uid())
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id 
  FROM organization_members
  WHERE profile_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Organizations policies
CREATE POLICY "Organizations viewable by members" ON organizations
  FOR SELECT USING (is_organization_member(id));

CREATE POLICY "Organizations creatable by authenticated users" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Organizations updatable by admins" ON organizations
  FOR UPDATE USING (is_organization_admin(id));

-- Profiles policies
CREATE POLICY "Profiles viewable by organization members" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.profile_id = auth.uid() 
      AND om2.profile_id = profiles.id
    )
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Organization members policies
CREATE POLICY "Members viewable by organization members" ON organization_members
  FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Members addable by admins" ON organization_members
  FOR INSERT WITH CHECK (is_organization_admin(organization_id));

CREATE POLICY "Members updatable by admins" ON organization_members
  FOR UPDATE USING (is_organization_admin(organization_id));

CREATE POLICY "Members deletable by admins" ON organization_members
  FOR DELETE USING (is_organization_admin(organization_id));

-- Projects policies
CREATE POLICY "Projects viewable by organization members" ON projects
  FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "Projects creatable by organization members" ON projects
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

CREATE POLICY "Projects modifiable by organization members" ON projects
  FOR UPDATE USING (is_organization_member(organization_id));

CREATE POLICY "Projects deletable by organization members" ON projects
  FOR DELETE USING (is_organization_member(organization_id));

-- Tasks policies
CREATE POLICY "Tasks accessible via project membership" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND is_organization_member(p.organization_id)
    )
  );

-- Subtasks policies
CREATE POLICY "Subtasks accessible via task access" ON subtasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = subtasks.task_id
      AND is_organization_member(p.organization_id)
    )
  );

-- Task dependencies policies
CREATE POLICY "Dependencies accessible via project membership" ON task_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE (t.id = task_dependencies.task_id OR t.id = task_dependencies.depends_on_id)
      AND is_organization_member(p.organization_id)
    )
  );

-- Members table policies (legacy - for backward compatibility)
CREATE POLICY "Members accessible by all authenticated users" ON members
  FOR ALL TO authenticated
  USING (true);

-- Sessions table policies
CREATE POLICY "Sessions accessible by all authenticated users" ON sessions
  FOR ALL TO authenticated
  USING (true);