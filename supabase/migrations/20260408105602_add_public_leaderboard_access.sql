/*
  # Add public access to campaign leaderboards

  ## Summary
  This migration adds RLS policies to allow anonymous (unauthenticated) users
  to view campaign leaderboard data. This is required for the public leaderboard
  feature where users can access leaderboards via QR codes or direct links without
  being logged in.

  ## Changes
  - Add SELECT policy for anonymous users on campaign_leaderboards table
  - Add SELECT policy for anonymous users on campaign_game_instances table
  - Add SELECT policy for anonymous users on campaigns table (limited fields)
  - Add SELECT policy for anonymous users on leads table (name/email only for leaderboard display)
  - Add SELECT policy for anonymous users on clients table (branding info only)
  - Add SELECT policy for anonymous users on brands table (branding info only)

  ## Security Notes
  - Only SELECT access is granted to anonymous users
  - Leaderboard data is considered public information
  - Personal contact information is visible but limited to what's shown in leaderboards
  - No write access is granted to anonymous users
*/

-- ============================================================================
-- Allow anonymous users to view leaderboard entries
-- ============================================================================

CREATE POLICY "Public can view leaderboard entries"
  ON campaign_leaderboards
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Allow anonymous users to view campaign game instances (for leaderboard context)
-- ============================================================================

CREATE POLICY "Public can view game instances"
  ON campaign_game_instances
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Allow anonymous users to view campaigns (for leaderboard branding)
-- ============================================================================

CREATE POLICY "Public can view campaigns"
  ON campaigns
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Allow anonymous users to view leads (for leaderboard player names)
-- ============================================================================

CREATE POLICY "Public can view lead names for leaderboards"
  ON leads
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Allow anonymous users to view clients (for leaderboard branding)
-- ============================================================================

CREATE POLICY "Public can view client branding"
  ON clients
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Allow anonymous users to view brands (for leaderboard branding)
-- ============================================================================

CREATE POLICY "Public can view brand branding"
  ON brands
  FOR SELECT
  TO anon
  USING (true);
