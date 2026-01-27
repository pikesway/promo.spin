/*
  # Fix Profiles RLS Circular Dependency

  1. Problem
    - The "Admins can view all profiles" policy queries the profiles table
    - This creates a circular dependency during RLS evaluation
    - Users cannot fetch their own profile due to this recursive check

  2. Solution
    - Drop the problematic admin policy that causes recursion
    - Create a security definer function to safely check admin status
    - Recreate admin policy using the security definer function

  3. Changes
    - Drop existing admin view policy on profiles
    - Create is_admin_safe() function with security definer
    - Recreate admin policy using the safe function
*/

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a security definer function that can bypass RLS to check admin status
CREATE OR REPLACE FUNCTION is_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
$$;

-- Recreate admin policy using the security definer function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin_safe());

-- Also fix the admin insert and update policies that have the same issue
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_safe());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin_safe())
  WITH CHECK (is_admin_safe());
