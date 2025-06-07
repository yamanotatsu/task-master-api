-- Function to create an organization with an admin member in a transaction
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  org_name TEXT,
  org_description TEXT,
  admin_id UUID
)
RETURNS TABLE(
  organization_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Check if organization name already exists
  IF EXISTS (SELECT 1 FROM organizations WHERE name = org_name) THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Organization name already exists';
    RETURN;
  END IF;

  -- Insert new organization
  INSERT INTO organizations (name, description)
  VALUES (org_name, org_description)
  RETURNING id INTO new_org_id;

  -- Add the creator as an admin member
  INSERT INTO organization_members (organization_id, profile_id, role, joined_at)
  VALUES (new_org_id, admin_id, 'admin', NOW());

  -- Return success
  RETURN QUERY SELECT new_org_id, TRUE, 'Organization created successfully';

EXCEPTION WHEN OTHERS THEN
  -- Rollback is automatic in functions
  RETURN QUERY SELECT NULL::UUID, FALSE, 'Failed to create organization: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_admin TO authenticated;