/*
  # Fix Profile RLS and JWT Role Issues

  1. Changes
    - Drop policies first, then recreate function
    - Update `is_admin_or_super_admin()` function with better error handling
    - Recreate RLS policies to work even when JWT doesn't have role
    - Add fallback to check profiles table directly for role
    
  2. Security
    - Maintains security while allowing profile fetch to work
    - Users can always read their own profile
    - Admins can read all profiles once their JWT is refreshed
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS is_admin_or_super_admin() CASCADE;

-- Create improved function that checks both JWT and profiles table
CREATE OR REPLACE FUNCTION is_admin_or_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  -- First try to get role from JWT (fast path)
  user_role := (auth.jwt()->>'role')::text;
  
  -- If role exists in JWT, use it
  IF user_role IS NOT NULL THEN
    RETURN user_role IN ('admin', 'super_admin');
  END IF;
  
  -- Fallback: check profiles table (for users whose JWT hasn't been refreshed yet)
  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role IN ('admin', 'super_admin'), false);
END;
$$;

-- Recreate the profiles RLS policies
-- SELECT policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin_or_super_admin());

-- UPDATE policies
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin_or_super_admin())
  WITH CHECK (is_admin_or_super_admin());

-- INSERT policy
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
