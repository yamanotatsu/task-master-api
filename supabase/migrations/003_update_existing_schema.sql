-- Add organization_id to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add assignee_id to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;

-- Create default organization for existing data
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Check if default organization exists
  SELECT id INTO default_org_id
  FROM organizations
  WHERE name = 'Default Organization'
  LIMIT 1;
  
  -- Create if not exists
  IF default_org_id IS NULL THEN
    INSERT INTO organizations (name)
    VALUES ('Default Organization')
    RETURNING id INTO default_org_id;
  END IF;
  
  -- Update existing projects to use default organization
  UPDATE projects
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;
  
  -- Make organization_id NOT NULL after migration
  ALTER TABLE projects
  ALTER COLUMN organization_id SET NOT NULL;
END $$;