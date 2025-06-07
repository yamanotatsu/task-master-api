-- Task 1.3: Implement Row Level Security (RLS) policies

-- First, drop the existing "allow all" policies
DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
DROP POLICY IF EXISTS "Allow all operations on members" ON members;
DROP POLICY IF EXISTS "Allow all operations on project_members" ON project_members;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on task_dependencies" ON task_dependencies;
DROP POLICY IF EXISTS "Allow all operations on subtasks" ON subtasks;
DROP POLICY IF EXISTS "Allow all operations on ai_dialogue_sessions" ON ai_dialogue_sessions;
DROP POLICY IF EXISTS "Allow all operations on ai_dialogue_messages" ON ai_dialogue_messages;

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations policies
-- SELECT: Users can view organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- INSERT: Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

-- UPDATE: Only admins can update organizations
CREATE POLICY "Admins can update organizations" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- DELETE: Only admins can delete organizations (though we'll rarely use this)
CREATE POLICY "Admins can delete organizations" ON organizations
    FOR DELETE USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- Profiles policies
-- SELECT: Users can view profiles in their organizations
CREATE POLICY "Users can view profiles in same organization" ON profiles
    FOR SELECT USING (
        id IN (
            SELECT om2.profile_id
            FROM organization_members om1
            JOIN organization_members om2 ON om1.organization_id = om2.organization_id
            WHERE om1.profile_id = auth.uid()
        )
        OR id = auth.uid()
    );

-- INSERT: Handled by trigger (system only)
-- No direct INSERT policy for users

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- DELETE: Users can delete their own profile (handled by CASCADE from auth.users)
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (id = auth.uid());

-- Organization members policies
-- SELECT: Users can view members of their organizations
CREATE POLICY "Users can view organization members" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- INSERT: Admins can add members
CREATE POLICY "Admins can add members" ON organization_members
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- UPDATE: Admins can update member roles
CREATE POLICY "Admins can update member roles" ON organization_members
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- DELETE: Admins can remove members
CREATE POLICY "Admins can remove members" ON organization_members
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- Projects policies
-- SELECT: Users can view projects in their organizations
CREATE POLICY "Users can view organization projects" ON projects
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- INSERT: Members can create projects in their organizations
CREATE POLICY "Members can create projects" ON projects
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- UPDATE: Members can update projects in their organizations
CREATE POLICY "Members can update projects" ON projects
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- DELETE: Only admins can delete projects
CREATE POLICY "Admins can delete projects" ON projects
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- Tasks policies
-- SELECT: Users can view tasks in their organization's projects
CREATE POLICY "Users can view organization tasks" ON tasks
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

-- INSERT: Members can create tasks
CREATE POLICY "Members can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- UPDATE: Members can update tasks
CREATE POLICY "Members can update tasks" ON tasks
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- DELETE: Members can delete tasks
CREATE POLICY "Members can delete tasks" ON tasks
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- Task dependencies policies (inherit from tasks)
-- SELECT: If you can see both tasks, you can see the dependency
CREATE POLICY "Users can view task dependencies" ON task_dependencies
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE p.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- INSERT/UPDATE/DELETE: Same as tasks
CREATE POLICY "Members can manage task dependencies" ON task_dependencies
    FOR ALL USING (
        task_id IN (
            SELECT id FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE p.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- Subtasks policies (inherit from tasks)
CREATE POLICY "Users can view subtasks" ON subtasks
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE p.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

CREATE POLICY "Members can manage subtasks" ON subtasks
    FOR ALL USING (
        task_id IN (
            SELECT id FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE p.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- AI dialogue policies
CREATE POLICY "Users can view AI dialogues" ON ai_dialogue_sessions
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

CREATE POLICY "Members can manage AI dialogues" ON ai_dialogue_sessions
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view AI messages" ON ai_dialogue_messages
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM ai_dialogue_sessions ads
            JOIN projects p ON ads.project_id = p.id
            WHERE p.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

CREATE POLICY "Members can manage AI messages" ON ai_dialogue_messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM ai_dialogue_sessions ads
            JOIN projects p ON ads.project_id = p.id
            WHERE p.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- Members table policies (legacy - for backward compatibility during migration)
-- Allow viewing all members for now (will be restricted after migration)
CREATE POLICY "View all members temporarily" ON members
    FOR SELECT USING (true);

-- Allow authenticated users to manage members temporarily
CREATE POLICY "Manage members temporarily" ON members
    FOR ALL USING (auth.role() = 'authenticated');

-- Project members policies (legacy)
CREATE POLICY "View project members temporarily" ON project_members
    FOR SELECT USING (true);

CREATE POLICY "Manage project members temporarily" ON project_members
    FOR ALL USING (auth.role() = 'authenticated');