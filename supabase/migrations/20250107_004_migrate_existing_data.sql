-- Task 1.4: Migrate existing data to new authentication system

-- Start transaction for safe migration
BEGIN;

-- Create backup tables (optional - for safety)
CREATE TABLE IF NOT EXISTS members_backup AS SELECT * FROM members;
CREATE TABLE IF NOT EXISTS projects_backup AS SELECT * FROM projects;

-- Step 1: Create default organization for existing data
INSERT INTO organizations (name) 
VALUES ('Default Organization')
ON CONFLICT DO NOTHING
RETURNING id;

-- Store the default org ID in a variable (using a CTE)
WITH default_org AS (
    SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1
),

-- Step 2: Migrate existing members to profiles
-- Note: This assumes members.id can be used as auth.users.id
-- In production, you might need to create auth users first
migrated_profiles AS (
    INSERT INTO profiles (id, full_name, avatar_url)
    SELECT 
        m.id,
        m.name as full_name,
        m.avatar_url
    FROM members m
    WHERE NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = m.id
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url
    RETURNING id
),

-- Step 3: Add all existing members to default organization as admins
migrated_memberships AS (
    INSERT INTO organization_members (organization_id, profile_id, role)
    SELECT 
        (SELECT id FROM default_org),
        m.id,
        'admin' -- Make all existing users admins of the default org
    FROM members m
    WHERE EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = m.id
    )
    ON CONFLICT (organization_id, profile_id) DO NOTHING
    RETURNING profile_id
)

-- Step 4: Update all projects to belong to the default organization
UPDATE projects 
SET organization_id = (
    SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1
)
WHERE organization_id IS NULL;

-- Verify migration
DO $$
DECLARE
    member_count INTEGER;
    profile_count INTEGER;
    org_member_count INTEGER;
    projects_without_org INTEGER;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO member_count FROM members;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO org_member_count FROM organization_members;
    SELECT COUNT(*) INTO projects_without_org FROM projects WHERE organization_id IS NULL;
    
    -- Log migration results
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Original members: %', member_count;
    RAISE NOTICE '  Migrated profiles: %', profile_count;
    RAISE NOTICE '  Organization memberships: %', org_member_count;
    RAISE NOTICE '  Projects without organization: %', projects_without_org;
    
    -- Verify all projects have an organization
    IF projects_without_org > 0 THEN
        RAISE EXCEPTION 'Migration failed: % projects still without organization', projects_without_org;
    END IF;
END $$;

-- Make organization_id NOT NULL after migration
ALTER TABLE projects 
ALTER COLUMN organization_id SET NOT NULL;

COMMIT;

-- Note: After successful migration and testing, you can:
-- 1. Drop the backup tables: DROP TABLE members_backup, projects_backup;
-- 2. Consider dropping or archiving the original members table
-- 3. Update project_members table to reference profiles instead of members