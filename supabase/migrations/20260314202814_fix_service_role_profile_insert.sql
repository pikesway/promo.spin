/*
  # Fix Service Role Profile Insert

  ## Changes
  Drops and recreates the admin insert policy to properly allow service role
  to insert profiles. The service role JWT has role='service_role' in the claims.

  ## Security
  - Service role can insert any profile (for edge functions)
  - Regular admins cannot directly insert profiles for others through the client
    (they must use the edge function which validates their admin status)
*/

-- Drop the previous policy
DROP POLICY IF EXISTS "Service role and admins can insert any profile" ON profiles;

-- Create a simpler policy that only checks for service_role
-- The edge function itself validates that the caller is an admin
CREATE POLICY "Service role can insert any profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );