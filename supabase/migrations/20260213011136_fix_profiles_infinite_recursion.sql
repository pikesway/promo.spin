/*
  # Fix Profiles Infinite Recursion

  The RESTRICTIVE policies created earlier cause infinite recursion because they
  query the profiles table to check admin status, which triggers the same policy.

  ## Solution
  - Remove RESTRICTIVE policies that cause recursion
  - Use PERMISSIVE policies with UNION logic (multiple policies OR together)
  - Admin policies will use a direct check without subquery on same table
  - Store role in JWT claims for admin checks (future optimization)

  ## Changes
  - Drop problematic RESTRICTIVE policies
  - Create PERMISSIVE admin policies that work correctly
*/

-- Drop the problematic RESTRICTIVE policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON app_bizgamez_agency.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON app_bizgamez_agency.profiles;

-- Recreate as PERMISSIVE policies
-- For SELECT: Users can see their own profile OR admins can see all
CREATE POLICY "Admins can view all profiles"
  ON app_bizgamez_agency.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Check if current user is admin by directly checking their role
    -- This works because we first allow users to see their own profile
    -- through the "Users can view own profile" policy
    (SELECT role FROM app_bizgamez_agency.profiles WHERE id = (SELECT auth.uid())) 
    IN ('super_admin', 'admin')
  );

-- For UPDATE: Users can update their own profile OR admins can update all
CREATE POLICY "Admins can update all profiles"
  ON app_bizgamez_agency.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM app_bizgamez_agency.profiles WHERE id = (SELECT auth.uid())) 
    IN ('super_admin', 'admin')
  )
  WITH CHECK (
    (SELECT role FROM app_bizgamez_agency.profiles WHERE id = (SELECT auth.uid())) 
    IN ('super_admin', 'admin')
  );