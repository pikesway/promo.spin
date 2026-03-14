/*
  # Fix Admin Profile Creation

  ## Changes
  Adds an RLS policy to allow service role and admin users to insert profiles
  for other users. This enables the admin-users edge function to create user
  profiles when creating new accounts.

  ## Security
  - Uses service_role bypass (current_setting returns 'service_role')
  - Also allows authenticated admins to create profiles via is_admin_or_super_admin check
*/

-- Add policy to allow service role and admins to insert profiles for any user
CREATE POLICY "Service role and admins can insert any profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if using service_role key (edge functions)
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Allow if user is admin/super_admin
    is_admin_or_super_admin((SELECT auth.uid()))
  );