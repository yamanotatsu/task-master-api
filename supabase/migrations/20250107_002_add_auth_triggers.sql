-- Task 1.2: Create triggers and functions for authentication

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to handle user deletion (cleanup related data)
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Organization cleanup will be handled by CASCADE constraints
    -- This function is for any additional cleanup if needed
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Trigger for user deletion cleanup
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_deletion();

-- Function to ensure at least one admin remains in an organization
CREATE OR REPLACE FUNCTION check_last_admin()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Only check if we're removing an admin or changing from admin role
    IF (TG_OP = 'DELETE' AND OLD.role = 'admin') OR 
       (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role != 'admin') THEN
        
        -- Count remaining admins
        SELECT COUNT(*) INTO admin_count
        FROM organization_members
        WHERE organization_id = OLD.organization_id
          AND role = 'admin'
          AND profile_id != OLD.profile_id;
        
        -- Prevent if this would leave no admins
        IF admin_count = 0 THEN
            RAISE EXCEPTION 'Cannot remove the last admin from an organization';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent removing the last admin
CREATE TRIGGER ensure_organization_has_admin
    BEFORE UPDATE OR DELETE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION check_last_admin();