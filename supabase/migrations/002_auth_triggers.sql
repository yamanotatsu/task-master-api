-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to create organization with admin
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  org_name text,
  admin_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  role text
) AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Create organization
  INSERT INTO organizations (name)
  VALUES (org_name)
  RETURNING organizations.id INTO new_org_id;
  
  -- Add user as admin
  INSERT INTO organization_members (organization_id, profile_id, role)
  VALUES (new_org_id, admin_id, 'admin');
  
  -- Return organization info
  RETURN QUERY
  SELECT new_org_id, org_name, 'admin'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;