/*
  # Fix Profiles RLS Circular Dependency

  1. Problem
    - Current RLS policies on profiles table have circular dependency
    - "Admins can view all profiles" policy queries profiles table to check admin status
    - This causes infinite recursion and timeouts

  2. Solution
    - Create helper function that checks role from auth.jwt() metadata
    - Update policies to use the helper function instead of querying profiles table
    - This breaks the circular dependency

  3. Changes
    - Drop existing problematic policies
    - Create is_admin_or_super_admin() helper function
    - Recreate policies using the helper function
*/

-- Drop existing policies that cause circular dependency
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Create helper function that checks role from JWT metadata
CREATE OR REPLACE FUNCTION is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt()->>'role')::text IN ('admin', 'super_admin'),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate policies using the helper function
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_super_admin());