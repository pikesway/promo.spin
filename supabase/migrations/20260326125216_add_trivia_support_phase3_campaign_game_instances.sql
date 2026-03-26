/*
  # Add Trivia Support - Phase 3: Campaign Game Instances Table

  ## Summary
  Creates the campaign_game_instances table to represent individual playable game units
  within a campaign. One campaign can contain multiple game instances (e.g., "80s Trivia Month"
  campaign with weekly trivia games).

  ## New Table: campaign_game_instances
  - `id` (uuid, PK) - Unique identifier
  - `campaign_id` (uuid, FK) - Parent campaign, CASCADE on delete
  - `client_id` (uuid, FK) - Denormalized for RLS, CASCADE on delete
  - `brand_id` (uuid, FK) - Denormalized for RLS, CASCADE on delete
  - `name` (text) - Display name
  - `slug` (text) - URL-friendly identifier
  - `game_system` (text) - Game type (trivia, expandable for future)
  - `template_id` (text) - External template reference (nullable for drafts)
  - `template_version` (text) - Version tracking (nullable for drafts)
  - `sequence_number` (integer) - Ordering within campaign
  - `status` (text) - Instance lifecycle state
  - `start_at` (timestamptz) - Scheduled start
  - `end_at` (timestamptz) - Scheduled end
  - `scoring_mode` (text) - Overrides campaign default if set
  - `config` (jsonb) - Instance-specific configuration
  - `launch_url` (text) - External game URL (nullable at DB, required before active)
  - `external_instance_ref` (text) - External system reference (nullable at DB, required before active)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Constraints
  - UNIQUE (campaign_id, slug)
  - UNIQUE (campaign_id, sequence_number) WHERE sequence_number IS NOT NULL
  - CHECK on status: draft, scheduled, active, paused, completed, archived
  - CHECK on game_system: trivia (expandable)
  - CHECK on scoring_mode: accuracy_only, accuracy_speed_weighted, accuracy_then_fastest_time

  ## Security
  - RLS enabled with policies mirroring campaigns table
  - Agency admins: full access
  - Client admins: access where client_id matches
  - Client users: access via brand permissions
*/

-- Create the campaign_game_instances table
CREATE TABLE IF NOT EXISTS campaign_game_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  game_system text NOT NULL DEFAULT 'trivia',
  template_id text,
  template_version text,
  sequence_number integer,
  status text NOT NULL DEFAULT 'draft',
  start_at timestamptz,
  end_at timestamptz,
  scoring_mode text,
  config jsonb DEFAULT '{}',
  launch_url text,
  external_instance_ref text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraints
  CONSTRAINT campaign_game_instances_campaign_slug_unique UNIQUE (campaign_id, slug),
  
  -- CHECK constraints
  CONSTRAINT campaign_game_instances_status_check 
    CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived')),
  CONSTRAINT campaign_game_instances_game_system_check 
    CHECK (game_system IN ('trivia')),
  CONSTRAINT campaign_game_instances_scoring_mode_check 
    CHECK (scoring_mode IS NULL OR scoring_mode IN ('accuracy_only', 'accuracy_speed_weighted', 'accuracy_then_fastest_time'))
);

-- Partial unique index for sequence_number within campaign
CREATE UNIQUE INDEX IF NOT EXISTS idx_cgi_campaign_sequence_unique 
ON campaign_game_instances (campaign_id, sequence_number) 
WHERE sequence_number IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_cgi_campaign_id ON campaign_game_instances (campaign_id);
CREATE INDEX IF NOT EXISTS idx_cgi_client_id ON campaign_game_instances (client_id);
CREATE INDEX IF NOT EXISTS idx_cgi_brand_id ON campaign_game_instances (brand_id);
CREATE INDEX IF NOT EXISTS idx_cgi_status ON campaign_game_instances (status);
CREATE INDEX IF NOT EXISTS idx_cgi_game_system ON campaign_game_instances (game_system);

-- Enable RLS
ALTER TABLE campaign_game_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Agency admins have full access
CREATE POLICY "Agency admins have full access to game instances"
ON campaign_game_instances
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- RLS Policy: Client admins can manage their client's game instances
CREATE POLICY "Client admins can manage their game instances"
ON campaign_game_instances
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.client_id = campaign_game_instances.client_id
    AND profiles.role = 'client_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.client_id = campaign_game_instances.client_id
    AND profiles.role = 'client_admin'
  )
);

-- RLS Policy: Client users can view game instances for their permitted brands
CREATE POLICY "Client users can view game instances for permitted brands"
ON campaign_game_instances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_brand_permissions ubp ON ubp.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.client_id = campaign_game_instances.client_id
    AND ubp.brand_id = campaign_game_instances.brand_id
  )
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_game_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_campaign_game_instances_updated_at ON campaign_game_instances;
CREATE TRIGGER trg_campaign_game_instances_updated_at
  BEFORE UPDATE ON campaign_game_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_game_instances_updated_at();
