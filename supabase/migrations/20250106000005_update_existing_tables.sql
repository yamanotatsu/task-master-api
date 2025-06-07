-- Add organization_id to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for organization_id on projects
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_created ON projects(organization_id, created_at DESC);

-- Add assignee_id to tasks table (already exists in current schema, but keeping for completeness)
-- ALTER TABLE tasks 
-- ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Update index name to match new convention
DROP INDEX IF EXISTS idx_tasks_assignee_id;
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assignee_status ON tasks(assignee_id, status) 
  WHERE assignee_id IS NOT NULL;

-- Rename members table to project_members and add profile_id
-- First, drop the existing project_members table (it's just a join table)
DROP TABLE IF EXISTS project_members CASCADE;

-- Rename members table
ALTER TABLE members RENAME TO project_members_temp;

-- Create new project_members table with proper structure
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'developer', 'viewer')) DEFAULT 'developer',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, profile_id)
);

-- Create indexes for project_members
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_profile_id ON project_members(profile_id);

-- Enable RLS on project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Comment on table
COMMENT ON TABLE project_members IS 'Members assigned to specific projects';
COMMENT ON COLUMN project_members.project_id IS 'Reference to project';
COMMENT ON COLUMN project_members.profile_id IS 'Reference to user profile';
COMMENT ON COLUMN project_members.role IS 'User role within the project';