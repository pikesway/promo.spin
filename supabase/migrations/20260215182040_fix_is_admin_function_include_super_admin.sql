/*
  # Fix is_admin Function to Include super_admin Role

  1. Problem
    - The is_admin() function only checks for 'admin' role
    - super_admin users are not recognized as admins by this function
    - This causes profile visibility issues for super_admin users

  2. Solution
    - Update is_admin() to check for both 'admin' and 'super_admin' roles
    - Ensure consistency with is_admin_safe() function

  3. Changes
    - Recreate is_admin() function with super_admin check
*/

CREATE OR REPLACE FUNCTION app_bizgamez_agency.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = app_bizgamez_agency
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_bizgamez_agency.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
$$;