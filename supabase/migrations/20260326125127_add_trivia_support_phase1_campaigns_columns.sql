/*
  # Add Trivia Support - Phase 1: Campaigns Table Columns

  ## Summary
  Adds new columns to the campaigns table to support trivia campaigns with leaderboards
  and scoring modes. This is an additive change that does not affect existing loyalty campaigns.

  ## Changes
  1. New Columns on `campaigns`:
     - `leaderboard_scope` (text, NOT NULL, default 'campaign') - Controls leaderboard aggregation
     - `default_scoring_mode` (text, nullable) - Default scoring mode for game instances
     - `default_geo_enabled` (boolean, nullable, default false) - Whether geofencing is enabled

  2. New CHECK Constraints:
     - `campaigns_leaderboard_scope_check` - Validates leaderboard_scope values
     - `campaigns_scoring_mode_check` - Validates default_scoring_mode values

  3. Type Constraint Update:
     - Alters `campaigns_type_check` to include 'trivia' as valid type

  ## Security
  - No RLS changes required (existing policies apply)

  ## Notes
  - leaderboard_scope is NOT NULL with default 'campaign' per design decision
  - Existing loyalty campaigns will have leaderboard_scope='campaign' (ignored for loyalty)
  - default_scoring_mode remains nullable (no default needed)
*/

-- Add leaderboard_scope column with NOT NULL DEFAULT 'campaign'
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS leaderboard_scope text NOT NULL DEFAULT 'campaign';

-- Add default_scoring_mode column (nullable)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS default_scoring_mode text;

-- Add default_geo_enabled column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS default_geo_enabled boolean DEFAULT false;

-- Add CHECK constraint for leaderboard_scope
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'campaigns_leaderboard_scope_check'
  ) THEN
    ALTER TABLE campaigns 
    ADD CONSTRAINT campaigns_leaderboard_scope_check 
    CHECK (leaderboard_scope IN ('campaign', 'instance', 'both'));
  END IF;
END $$;

-- Add CHECK constraint for default_scoring_mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'campaigns_scoring_mode_check'
  ) THEN
    ALTER TABLE campaigns 
    ADD CONSTRAINT campaigns_scoring_mode_check 
    CHECK (default_scoring_mode IS NULL OR default_scoring_mode IN ('accuracy_only', 'accuracy_speed_weighted', 'accuracy_then_fastest_time'));
  END IF;
END $$;

-- Update the type CHECK constraint to include 'trivia'
-- First drop the existing constraint, then recreate with new values
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;

ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_type_check 
CHECK (type IN ('spin', 'scratch', 'bizgamez', 'loyalty', 'trivia'));
