/*
  # Lock Down View Permissions to Read-Only

  ## Security Issue
  The public_leaderboard_view was created with default grants that include
  INSERT, UPDATE, DELETE, and other write privileges to the anon role.

  Views should be read-only for security.

  ## Solution
  Revoke all privileges from anon on the view, then grant ONLY SELECT.

  ## Changes
  1. Revoke ALL privileges from anon on public_leaderboard_view
  2. Revoke ALL privileges from authenticated on public_leaderboard_view
  3. Grant ONLY SELECT to anon
  4. Grant ONLY SELECT to authenticated
*/

-- ============================================================================
-- Revoke all privileges and grant only SELECT
-- ============================================================================

-- Revoke everything first (belt and suspenders)
REVOKE ALL ON public_leaderboard_view FROM anon;
REVOKE ALL ON public_leaderboard_view FROM authenticated;

-- Grant only SELECT permission
GRANT SELECT ON public_leaderboard_view TO anon;
GRANT SELECT ON public_leaderboard_view TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After this migration:
-- ✅ anon can SELECT from public_leaderboard_view
-- ❌ anon cannot INSERT/UPDATE/DELETE/TRUNCATE on public_leaderboard_view
-- ❌ anon cannot SELECT from leads table (no grant, no policy)
-- ✅ authenticated users can SELECT from public_leaderboard_view
-- ✅ authenticated users can still access leads table via their own RLS policies