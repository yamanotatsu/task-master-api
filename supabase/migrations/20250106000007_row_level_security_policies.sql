-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
DROP POLICY IF EXISTS "Allow all operations on members" ON members;
DROP POLICY IF EXISTS "Allow all operations on project_members" ON project_members;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on task_dependencies" ON task_dependencies;
DROP POLICY IF EXISTS "Allow all operations on subtasks" ON subtasks;
DROP POLICY IF EXISTS "Allow all operations on ai_dialogue_sessions" ON ai_dialogue_sessions;
DROP POLICY IF EXISTS "Allow all operations on ai_dialogue_messages" ON ai_dialogue_messages;

-- Organizations RLS Policies
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete organizations" ON organizations
  FOR DELETE USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Organization members can view profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT om2.profile_id 
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.profile_id = auth.uid()
    )
  );

-- Organization Members RLS Policies
CREATE POLICY "Members can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Invitations RLS Policies
CREATE POLICY "Organization admins can view invitations" ON invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Organization admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Organization admins can delete invitations" ON invitations
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Projects RLS Policies
CREATE POLICY "Organization members can view projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create projects" ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Project admins can update projects" ON projects
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Organization admins can delete projects" ON projects
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Project Members RLS Policies
CREATE POLICY "Project members can view member list" ON project_members
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project admins can manage members" ON project_members
  FOR ALL USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE profile_id = auth.uid() 
        AND role = 'admin'
      )
    )
  );

-- Tasks RLS Policies
CREATE POLICY "Users can view tasks in their projects" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE profile_id = auth.uid()
      )
    )
    OR
    assignee_id = auth.uid()
  );

CREATE POLICY "Project members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update tasks" ON tasks
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Project admins can delete tasks" ON tasks
  FOR DELETE USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Task Dependencies RLS Policies
CREATE POLICY "Users can view task dependencies" ON task_dependencies
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE profile_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project members can manage dependencies" ON task_dependencies
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE project_id IN (
        SELECT project_id 
        FROM project_members 
        WHERE profile_id = auth.uid()
      )
    )
  );

-- Subtasks RLS Policies
CREATE POLICY "Users can view subtasks" ON subtasks
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE profile_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project members can manage subtasks" ON subtasks
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE project_id IN (
        SELECT project_id 
        FROM project_members 
        WHERE profile_id = auth.uid()
      )
    )
  );

-- AI Dialogue Sessions RLS Policies
CREATE POLICY "Organization members can view dialogue sessions" ON ai_dialogue_sessions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project members can create dialogue sessions" ON ai_dialogue_sessions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update dialogue sessions" ON ai_dialogue_sessions
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid()
    )
  );

-- AI Dialogue Messages RLS Policies
CREATE POLICY "Users can view dialogue messages" ON ai_dialogue_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM ai_dialogue_sessions 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE profile_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project members can create dialogue messages" ON ai_dialogue_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM ai_dialogue_sessions 
      WHERE project_id IN (
        SELECT project_id 
        FROM project_members 
        WHERE profile_id = auth.uid()
      )
    )
  );