-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, profile_id)
);

-- Create indexes for organization_members
CREATE INDEX idx_org_members_profile_id ON organization_members(profile_id);
CREATE INDEX idx_org_members_role ON organization_members(role);
CREATE INDEX idx_org_members_joined_at ON organization_members(joined_at);
CREATE INDEX idx_org_members_profile_org ON organization_members(profile_id, organization_id);

-- Enable RLS on organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Comment on table
COMMENT ON TABLE organization_members IS 'Many-to-many relationship between users and organizations';
COMMENT ON COLUMN organization_members.organization_id IS 'Reference to organization';
COMMENT ON COLUMN organization_members.profile_id IS 'Reference to user profile';
COMMENT ON COLUMN organization_members.role IS 'User role within the organization (admin or member)';
COMMENT ON COLUMN organization_members.joined_at IS 'When the user joined the organization';