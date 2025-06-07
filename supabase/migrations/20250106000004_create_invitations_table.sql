-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invitations
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX idx_invitations_pending ON invitations(organization_id, email) 
  WHERE accepted_at IS NULL AND expires_at > NOW();

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Comment on table
COMMENT ON TABLE invitations IS 'Invitations to join organizations';
COMMENT ON COLUMN invitations.id IS 'Unique identifier for the invitation';
COMMENT ON COLUMN invitations.organization_id IS 'Organization the user is being invited to';
COMMENT ON COLUMN invitations.email IS 'Email address of the invitee';
COMMENT ON COLUMN invitations.role IS 'Role the invitee will have in the organization';
COMMENT ON COLUMN invitations.invited_by IS 'Profile ID of who sent the invitation';
COMMENT ON COLUMN invitations.token IS 'Unique token for invitation link';
COMMENT ON COLUMN invitations.expires_at IS 'When the invitation expires';
COMMENT ON COLUMN invitations.accepted_at IS 'When the invitation was accepted';