-- Data Migration Script
-- This migration handles the transition from the old schema to the new multi-tenant schema

-- Step 1: Create a default organization for existing data
INSERT INTO organizations (id, name, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'Automatically created organization for existing data migration'
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create profiles for existing members
INSERT INTO profiles (id, full_name, avatar_url)
SELECT 
  id,
  name as full_name,
  avatar_url
FROM project_members_temp
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add existing members to the default organization
INSERT INTO organization_members (organization_id, profile_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001' as organization_id,
  id as profile_id,
  CASE 
    WHEN role = 'admin' THEN 'admin'
    ELSE 'member'
  END as role
FROM project_members_temp
ON CONFLICT (organization_id, profile_id) DO NOTHING;

-- Step 4: Update projects with organization_id
UPDATE projects 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 5: Make organization_id NOT NULL after migration
ALTER TABLE projects 
ALTER COLUMN organization_id SET NOT NULL;

-- Step 6: Migrate project members data
-- First, backup the old members table data
CREATE TABLE IF NOT EXISTS members_backup AS 
SELECT * FROM project_members_temp;

-- Insert project member relationships from the old data
INSERT INTO project_members (project_id, profile_id, role)
SELECT DISTINCT
  pm.project_id,
  pm.member_id as profile_id,
  pmt.role
FROM (
  -- Get the old project_members relationship data
  SELECT project_id, member_id 
  FROM members_backup mb
  JOIN projects p ON EXISTS (
    SELECT 1 FROM project_members_temp pmt 
    WHERE pmt.id = mb.id
  )
) pm
JOIN project_members_temp pmt ON pmt.id = pm.member_id
ON CONFLICT (project_id, profile_id) DO NOTHING;

-- Step 7: Update tasks to reference profiles instead of members
UPDATE tasks t
SET assignee_id = (
  SELECT id 
  FROM profiles p 
  WHERE p.id = t.assignee_id
)
WHERE assignee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = t.assignee_id
  );

-- Step 8: Update subtasks to reference profiles
UPDATE subtasks s
SET assignee_id = (
  SELECT id 
  FROM profiles p 
  WHERE p.id = s.assignee_id
)
WHERE assignee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = s.assignee_id
  );

-- Step 9: Clean up - drop the temporary table
DROP TABLE IF EXISTS project_members_temp CASCADE;

-- Step 10: Add foreign key constraints that reference profiles
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey,
  ADD CONSTRAINT tasks_assignee_id_fkey 
    FOREIGN KEY (assignee_id) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE subtasks
  DROP CONSTRAINT IF EXISTS subtasks_assignee_id_fkey,
  ADD CONSTRAINT subtasks_assignee_id_fkey 
    FOREIGN KEY (assignee_id) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- Step 11: Create a function to handle first user signup (make them org admin)
CREATE OR REPLACE FUNCTION handle_first_org_member()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first member of an organization, make them admin
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = NEW.organization_id
  ) THEN
    NEW.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_first_member_is_admin
  BEFORE INSERT ON organization_members
  FOR EACH ROW EXECUTE FUNCTION handle_first_org_member();

-- Add comment about migration
COMMENT ON TABLE members_backup IS 'Backup of original members table before authentication migration. Can be dropped after verification.';