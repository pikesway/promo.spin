/*
  # Sync Role to JWT Metadata

  1. Problem
    - User roles are stored in profiles table but not in JWT
    - Helper function needs role in JWT to avoid circular dependency
    
  2. Solution
    - Create trigger to sync role from profiles to auth.users metadata
    - Update existing users to have role in their JWT
    - This allows RLS policies to check role without querying profiles table

  3. Changes
    - Create function to sync role to JWT
    - Create trigger on profiles table
    - Update existing users with their roles
*/

-- Function to sync role to JWT metadata
CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's raw_app_meta_data with their role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync role on insert or update
DROP TRIGGER IF EXISTS sync_role_to_jwt_trigger ON profiles;
CREATE TRIGGER sync_role_to_jwt_trigger
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_jwt();

-- Update existing users with their roles
UPDATE auth.users u
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', p.role)
FROM profiles p
WHERE u.id = p.id;