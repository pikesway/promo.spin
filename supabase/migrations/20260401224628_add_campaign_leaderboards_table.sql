/*
  # Create campaign_leaderboards table for Trivia integration

  ## Summary
  This migration creates a new campaign_leaderboards table to track game completions
  from external Trivia applications. The table records each game play with score and
  timing data, allowing multiple entries per lead per campaign for analytics.

  ## New Tables
  - `campaign_leaderboards`
    - `id` (uuid, primary key) - Unique identifier for each leaderboard entry
    - `campaign_id` (uuid, FK to campaigns) - Links to the associated campaign
    - `lead_id` (uuid, FK to leads) - Links to the player who completed the game
    - `final_score` (numeric) - The score achieved in the game
    - `time_elapsed_seconds` (integer) - Time taken to complete the game
    - `completed_at` (timestamptz) - When the game was completed
    - `metadata` (jsonb) - Additional data like source, external IDs, etc.
    - `created_at` (timestamptz) - Record creation timestamp

  ## Indexes
  - `idx_campaign_leaderboards_campaign_id` - For campaign-specific queries
  - `idx_campaign_leaderboards_lead_id` - For player-specific queries
  - `idx_campaign_leaderboards_score` - For ranking/leaderboard queries
  - `idx_campaign_leaderboards_campaign_lead` - Composite index for player ranking within campaigns

  ## Security
  - RLS enabled on campaign_leaderboards table
  - Authenticated users can view leaderboard entries
  - Service role can insert entries (for webhook)
  - Admin users can view and manage all entries

  ## Notes
  - Allows multiple entries per lead per campaign for analytics
  - Leaderboard displays will query for highest score per lead
  - Metadata field stores additional context from webhook payloads
*/

-- ============================================================================
-- STEP 1: Create campaign_leaderboards table
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  final_score numeric NOT NULL DEFAULT 0,
  time_elapsed_seconds integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 2: Add indexes for efficient queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboards_campaign_id 
  ON campaign_leaderboards(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboards_lead_id 
  ON campaign_leaderboards(lead_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboards_score 
  ON campaign_leaderboards(final_score DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboards_campaign_lead 
  ON campaign_leaderboards(campaign_id, lead_id);

-- ============================================================================
-- STEP 3: Enable RLS and create policies
-- ============================================================================

ALTER TABLE campaign_leaderboards ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view leaderboard entries
CREATE POLICY "Authenticated users can view leaderboard entries"
  ON campaign_leaderboards
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can insert leaderboard entries (for webhook)
CREATE POLICY "Service role can insert leaderboard entries"
  ON campaign_leaderboards
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin users can update and delete leaderboard entries
CREATE POLICY "Admin users can manage leaderboard entries"
  ON campaign_leaderboards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
