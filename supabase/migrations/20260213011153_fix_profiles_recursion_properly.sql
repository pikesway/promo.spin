/*
  # Fix Profiles Recursion Properly

  The previous fix still has recursion because admin policies query profiles table.
  
  ## Solution
  Create a SECURITY DEFINER function that bypasses RLS to get current user's role,
  then use that function in policies.

  ## Changes
  - Create function to get current user role that bypasses RLS
  - Update admin policies to use this function
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON app_bizgamez_agency.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON app_bizgamez_agency.profiles;

-- Create a function to get current user's role that bypasses RLS
CREATE OR REPLACE FUNCTION app_bizgamez_agency.get_current_user_role()
RETURNS app_bizgamez_agency.user_role
SECURITY DEFINER
SET search_path = app_bizgamez_agency, public, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_role app_bizgamez_agency.user_role;
BEGIN
  -- This function has SECURITY DEFINER so it bypasses RLS
  SELECT role INTO user_role
  FROM app_bizgamez_agency.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'client'::app_bizgamez_agency.user_role);
END;
$$;

-- Now create admin policies using this function
CREATE POLICY "Admins can view all profiles"
  ON app_bizgamez_agency.profiles
  FOR SELECT
  TO authenticated
  USING (
    app_bizgamez_agency.get_current_user_role() IN ('super_admin', 'admin')
  );

CREATE POLICY "Admins can update all profiles"
  ON app_bizgamez_agency.profiles
  FOR UPDATE
  TO authenticated
  USING (
    app_bizgamez_agency.get_current_user_role() IN ('super_admin', 'admin')
  )
  WITH CHECK (
    app_bizgamez_agency.get_current_user_role() IN ('super_admin', 'admin')
  );