/*
  # Remove Public Access to Leads Table

  ## Critical Security Issue
  There is an existing RLS policy "Anyone can view leads" that grants public
  (including anon) SELECT access to ALL columns in the leads table, including:
  - email addresses
  - phone numbers
  - other sensitive PII

  This policy predates the public leaderboard feature and was likely intended
  for game play functionality, but it creates a massive data breach vulnerability.

  ## Solution
  1. Drop the "Anyone can view leads" policy
  2. Create a more restrictive policy for authenticated users only
  3. Keep "Anyone can create leads" for game play lead capture
  4. Use public_leaderboard_view for public leaderboard access

  ## Security Model After This Migration
  - anon: Can INSERT leads (for lead capture), can SELECT from public_leaderboard_view only
  - authenticated: Can SELECT their own leads and leads in their scope via RLS
  - public leaderboards: Access via public_leaderboard_view (names only, no PII)

  ## Changes
  1. Drop "Anyone can view leads" policy
  2. Add authenticated-only policies for appropriate access
*/

-- ============================================================================
-- Drop the public read access policy
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view leads" ON leads;

-- ============================================================================
-- Add proper authenticated access policies
-- ============================================================================

-- Admin users can view all leads
CREATE POLICY "Admin users can view all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can view leads in their client scope
CREATE POLICY "Users can view leads in their scope"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.client_id = leads.client_id
    )
  );

-- ============================================================================
-- Keep INSERT policy for lead capture (game plays)
-- ============================================================================

-- "Anyone can create leads" policy already exists and is correct
-- This allows game players to submit their information

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After this migration:
-- ❌ anon CANNOT: SELECT * FROM leads (no policy)
-- ❌ anon CANNOT: SELECT email FROM leads (no policy)
-- ✅ anon CAN: INSERT INTO leads (for game lead capture)
-- ✅ anon CAN: SELECT * FROM public_leaderboard_view (safe columns only)
-- ✅ authenticated CAN: SELECT leads in their scope via RLS
-- ✅ admin CAN: SELECT all leads