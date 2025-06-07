-- Task 1.5: Post-migration cleanup and optimization
-- This migration should be run after verifying the data migration was successful

-- Add a migration status check
DO $$
DECLARE
    profile_count INTEGER;
    member_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO member_count FROM members;
    
    -- Only proceed if migration looks successful
    IF profile_count = 0 OR profile_count < member_count THEN
        RAISE EXCEPTION 'Migration appears incomplete. Profile count: %, Member count: %', profile_count, member_count;
    END IF;
END $$;

-- Update project_members to use profiles instead of members
-- First, add a new column for profile_id
ALTER TABLE project_members 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Migrate data from member_id to profile_id
UPDATE project_members pm
SET profile_id = m.id
FROM members m
WHERE pm.member_id = m.id
AND pm.profile_id IS NULL;

-- Create new constraint before dropping old one
DO $$
BEGIN
    -- Check if we can safely proceed
    IF NOT EXISTS (
        SELECT 1 FROM project_members WHERE profile_id IS NULL AND member_id IS NOT NULL
    ) THEN
        -- Drop old foreign key constraint
        ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_member_id_fkey;
        
        -- Drop old primary key
        ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_pkey;
        
        -- Create new primary key
        ALTER TABLE project_members ADD PRIMARY KEY (project_id, profile_id);
        
        -- Drop the old member_id column
        ALTER TABLE project_members DROP COLUMN IF EXISTS member_id;
    ELSE
        RAISE NOTICE 'Cannot complete project_members migration - some records still have null profile_id';
    END IF;
END $$;

-- Add invitation tracking table for Phase 4
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for invitation table
CREATE INDEX idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX idx_org_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_org_invitations_expires ON organization_invitations(expires_at) WHERE NOT accepted;

-- Create a view for easier member queries
CREATE OR REPLACE VIEW organization_members_view AS
SELECT 
    om.organization_id,
    om.profile_id,
    om.role,
    om.joined_at,
    p.full_name,
    p.avatar_url,
    o.name as organization_name
FROM organization_members om
JOIN profiles p ON om.profile_id = p.id
JOIN organizations o ON om.organization_id = o.id;

-- Grant appropriate permissions on the view
GRANT SELECT ON organization_members_view TO authenticated;

-- Add RLS policy for invitations
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage invitations for their organizations
CREATE POLICY "Admins can manage invitations" ON organization_invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their invitations" ON organization_invitations
    FOR SELECT USING (
        email = auth.jwt()->>'email'
    );

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    DELETE FROM organization_invitations
    WHERE expires_at < now() AND NOT accepted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a scheduled job to clean up expired invitations
-- This would need to be set up in Supabase dashboard or via pg_cron if available

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Post-migration cleanup completed successfully';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Verify all data has been migrated correctly';
    RAISE NOTICE '  2. Test authentication flows';
    RAISE NOTICE '  3. Consider archiving or dropping the members table';
    RAISE NOTICE '  4. Drop backup tables if no longer needed';
END $$;