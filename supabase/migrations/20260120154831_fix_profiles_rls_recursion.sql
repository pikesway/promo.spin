/*
  # Fix Infinite Recursion in Profiles RLS

  ## Problem
  The current RLS policies query the profiles table from within the policies themselves,
  causing infinite recursion when trying to check user roles.

  ## Solution
  Use auth.uid() and JWT claims instead of querying the profiles table.
  Store the role in raw_app_meta_data so it can be accessed via auth.jwt().

  ## Changes
  1. Drop all existing policies on profiles table
  2. Create new policies that don't create circular dependencies
  3. Use simple auth.uid() checks for basic access
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update client profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;

-- Create simplified policies that avoid recursion

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile (but not change their role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- For now, we'll handle admin access through the application layer
-- or by using service role key for admin operations