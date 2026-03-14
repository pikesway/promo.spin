/*
  # Fix Circular Dependency in Profile RLS Policies

  1. Changes
    - Create a SECURITY DEFINER function to check user roles without RLS
    - Update admin policies to use this function instead of querying profiles directly
    - This breaks the circular dependency that was preventing profile loading

  2. Security
    - Function only returns role information, no sensitive data
    - Still maintains proper access control
*/

-- Create a security definer function to get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role_value;
END;
$$;

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Recreate admin policies using the security definer function
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'super_admin')
  );