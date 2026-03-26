/*
  # Add Finalization Columns

  1. Changes
    - Add `finalized_at` and `finalized_by` to `campaign_game_instances`
    - Add `finalized_at` and `finalized_by` to `campaigns` (for trivia type)

  2. Purpose
    - Track when instances and campaigns are finalized
    - Track who performed the finalization
    - Support idempotent finalization operations
*/

-- Add finalization columns to campaign_game_instances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_game_instances' AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE campaign_game_instances ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_game_instances' AND column_name = 'finalized_by'
  ) THEN
    ALTER TABLE campaign_game_instances ADD COLUMN finalized_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add finalization columns to campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'finalized_by'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN finalized_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for finding finalized instances
CREATE INDEX IF NOT EXISTS idx_cgi_finalized ON campaign_game_instances(finalized_at) WHERE finalized_at IS NOT NULL;

-- Create index for finding finalized campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_finalized ON campaigns(finalized_at) WHERE finalized_at IS NOT NULL;
