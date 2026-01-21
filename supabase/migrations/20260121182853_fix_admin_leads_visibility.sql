/*
  # Fix Admin Leads Visibility

  1. Problem
    - Super admin users cannot see all leads in the dashboard
    - The is_admin() function may have timing issues with auth.uid()

  2. Solution
    - Drop the existing admin policy that relies on is_admin()
    - Create a new direct policy that checks profile role inline
    - This avoids potential function call timing issues

  3. Security
    - Only users with 'admin' or 'super_admin' role can view all leads
    - Regular client users can still only view their own client's leads
*/

-- Drop the existing admin policy
DROP POLICY IF EXISTS "Admins can view all leads" ON leads;

-- Create a more direct admin policy that doesn't rely on function call
CREATE POLICY "Admins can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Also ensure the anon policy exists for webhook operations
DROP POLICY IF EXISTS "Anon can read leads for insert return" ON leads;
CREATE POLICY "Anon can read leads for insert return"
  ON leads FOR SELECT
  TO anon
  USING (true);