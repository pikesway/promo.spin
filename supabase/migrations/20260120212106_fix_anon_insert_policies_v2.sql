/*
  # Fix RLS policies for anonymous game players - v2

  1. Problem
    - Anonymous users cannot INSERT leads and redemptions
    - The INSERT policies exist but may not be working correctly

  2. Solution
    - Drop and recreate INSERT policies with correct permissions
    - Ensure policies use 'public' role which includes both anon and authenticated
    - Add explicit SELECT on clients for anon (needed for FK validation context)

  3. Security Notes
    - Public users can only insert, not update or delete
    - This is required for the game to function
*/

-- Drop existing INSERT policies for leads
DROP POLICY IF EXISTS "Public can insert leads" ON leads;

-- Recreate INSERT policy for leads with public role
CREATE POLICY "Public can insert leads"
  ON leads FOR INSERT
  TO public
  WITH CHECK (true);

-- Drop existing INSERT policies for redemptions  
DROP POLICY IF EXISTS "Public can insert redemptions" ON redemptions;

-- Recreate INSERT policy for redemptions with public role
CREATE POLICY "Public can insert redemptions"
  ON redemptions FOR INSERT
  TO public
  WITH CHECK (true);

-- Ensure anon can read clients (for context, though FK checks bypass RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' AND policyname = 'Anon can view clients'
  ) THEN
    CREATE POLICY "Anon can view clients"
      ON clients FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Ensure anon can read campaigns for active status
DROP POLICY IF EXISTS "Public can view campaigns by slug" ON campaigns;

CREATE POLICY "Anon can view active campaigns"
  ON campaigns FOR SELECT
  TO anon
  USING (status = 'active');
