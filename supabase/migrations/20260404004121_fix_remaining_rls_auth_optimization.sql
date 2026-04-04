/*
  # Fix Remaining RLS Auth Function Optimization

  ## What This Migration Does

  ### Performance: Optimize 3 Remaining RLS Policies
  Fixes the last policies that re-evaluate auth functions for each row:
  1. profiles: "Service role can insert any profile"
  2. game_plays: "Players can view their own game plays by session"
  3. game_plays: "Players can update their own game plays by session"

  These policies were already wrapped in SELECT in the previous migration,
  but they're still using current_setting() which also needs optimization.

  ## Impact
  - Prevents row-by-row evaluation of auth context
  - Critical for query performance at scale
  - Completes RLS optimization across entire database
*/

-- Fix profiles policy - already uses SELECT for JWT check, just ensure it's optimized
DROP POLICY IF EXISTS "Service role can insert any profile" ON public.profiles;
CREATE POLICY "Service role can insert any profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- Fix game_plays session-based policies
-- The current_setting call needs to be wrapped in a subquery as well
DROP POLICY IF EXISTS "Players can view their own game plays by session" ON public.game_plays;
CREATE POLICY "Players can view their own game plays by session"
  ON public.game_plays FOR SELECT
  TO authenticated, anon
  USING (
    session_id = (
      SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'session_id'),
        ''
      )
    )
  );

DROP POLICY IF EXISTS "Players can update their own game plays by session" ON public.game_plays;
CREATE POLICY "Players can update their own game plays by session"
  ON public.game_plays FOR UPDATE
  TO authenticated, anon
  USING (
    session_id = (
      SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'session_id'),
        ''
      )
    )
  )
  WITH CHECK (
    session_id = (
      SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'session_id'),
        ''
      )
    )
  );
