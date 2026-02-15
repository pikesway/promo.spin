/*
  # Fix Profiles RLS Infinite Recursion

  1. Problem
    - The consolidated profile policies query the profiles table to check admin status
    - This causes infinite recursion since the query triggers the same RLS policy

  2. Solution
    - Create a SECURITY DEFINER function that bypasses RLS to check admin status
    - Replace the recursive policies with policies that use this function

  3. Changes
    - Drop recursive policies
    - Create is_admin() function with SECURITY DEFINER
    - Create new non-recursive policies
*/

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view own or admin can view all profiles" ON app_bizgamez_agency.profiles;
DROP POLICY IF EXISTS "Users can update own or admin can update all profiles" ON app_bizgamez_agency.profiles;

-- Create a SECURITY DEFINER function to check admin status without triggering RLS
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
    AND role = 'admin'
  )
$$;

-- Create non-recursive SELECT policy
CREATE POLICY "Authenticated users can view profiles"
  ON app_bizgamez_agency.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR app_bizgamez_agency.is_admin()
  );

-- Create non-recursive UPDATE policy
CREATE POLICY "Authenticated users can update profiles"
  ON app_bizgamez_agency.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR app_bizgamez_agency.is_admin()
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR app_bizgamez_agency.is_admin()
  );