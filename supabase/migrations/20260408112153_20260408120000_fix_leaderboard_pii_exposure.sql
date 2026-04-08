/*
  # Fix Critical PII Exposure in Public Leaderboards

  ## Security Issue
  The previous migration (20260408105602) inadvertently exposed ALL columns in the
  leads table to anonymous users, including sensitive PII:
  - email addresses
  - phone numbers
  - other personal information

  RLS policies control row-level access, NOT column-level access. A policy like
  "USING (true)" allows SELECT * FROM leads, exposing all columns.

  ## Solution
  1. REVOKE all anon access to the leads table
  2. Create a secure database VIEW that:
     - Uses SECURITY DEFINER to bypass RLS
     - Exposes ONLY the id and name columns from leads
     - Joins with campaign_leaderboards to provide public leaderboard data
  3. Grant SELECT on the view to anon role

  ## Security Principles Applied
  - Principle of Least Privilege: anon role gets ONLY what's needed
  - Defense in Depth: View + column selection + explicit grants
  - No Direct Table Access: anon cannot query leads table at all

  ## Changes
  1. Revoke anon SELECT access on leads table
  2. Drop the insecure RLS policy on leads
  3. Create public_leaderboard_view with SECURITY DEFINER
  4. Grant SELECT on view to anon and authenticated roles
*/

-- ============================================================================
-- STEP 1: Revoke direct access to leads table from anon role
-- ============================================================================

-- Drop the insecure policy that allowed anon to read all leads data
DROP POLICY IF EXISTS "Public can view lead names for leaderboards" ON leads;

-- Explicitly revoke any grants (belt and suspenders approach)
REVOKE ALL ON leads FROM anon;

-- ============================================================================
-- STEP 2: Create secure public leaderboard view
-- ============================================================================

-- Drop view if it exists (for idempotency)
DROP VIEW IF EXISTS public_leaderboard_view;

-- Create view that exposes ONLY safe columns
-- SECURITY DEFINER means it runs with creator's privileges, bypassing RLS
CREATE VIEW public_leaderboard_view
WITH (security_invoker = false)  -- This makes it SECURITY DEFINER
AS
SELECT
  cl.id as leaderboard_id,
  cl.campaign_id,
  cl.lead_id,
  cl.final_score as score,
  cl.time_elapsed_seconds,
  cl.completed_at,
  cl.metadata,
  -- ONLY safe columns from leads table (NO email, phone, or other PII)
  l.id as player_id,
  l.name as player_name,
  -- Campaign context for branding
  c.id as campaign_id_ref,
  c.name as campaign_name,
  c.client_id,
  c.brand_id
FROM campaign_leaderboards cl
INNER JOIN leads l ON l.id = cl.lead_id
INNER JOIN campaigns c ON c.id = cl.campaign_id;

-- Add helpful comment
COMMENT ON VIEW public_leaderboard_view IS
  'Secure view for public leaderboard access. Exposes only player names (no PII like email/phone). Uses SECURITY DEFINER to bypass RLS while maintaining column-level security.';

-- ============================================================================
-- STEP 3: Grant SELECT on view to anon and authenticated users
-- ============================================================================

GRANT SELECT ON public_leaderboard_view TO anon;
GRANT SELECT ON public_leaderboard_view TO authenticated;

-- ============================================================================
-- STEP 4: Verify indexes exist for view performance
-- ============================================================================

-- The view joins on these columns, ensure they're indexed
-- (Most should already exist from previous migrations)

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboards_campaign_id
  ON campaign_leaderboards(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboards_lead_id
  ON campaign_leaderboards(lead_id);

CREATE INDEX IF NOT EXISTS idx_leads_id
  ON leads(id);

CREATE INDEX IF NOT EXISTS idx_campaigns_id
  ON campaigns(id);

-- ============================================================================
-- VERIFICATION QUERIES (for documentation/testing)
-- ============================================================================

-- The following queries demonstrate the security model:
--
-- ❌ BLOCKED: Direct access to leads table as anon
-- SELECT * FROM leads;
-- Result: permission denied (RLS policy dropped, no grants)
--
-- ❌ BLOCKED: Attempting to access email/phone
-- SELECT email, phone FROM leads WHERE name = 'John Doe';
-- Result: permission denied
--
-- ✅ ALLOWED: Access through secure view as anon
-- SELECT player_name, score FROM public_leaderboard_view WHERE campaign_id = '...';
-- Result: Returns only safe columns (no email/phone)
--
-- ✅ VERIFY: Check what columns are exposed
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'public_leaderboard_view' 
-- ORDER BY ordinal_position;
-- Result: Only safe columns, no PII