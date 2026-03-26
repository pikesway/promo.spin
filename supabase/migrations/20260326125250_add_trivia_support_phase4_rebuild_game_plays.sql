/*
  # Add Trivia Support - Phase 4: Rebuild game_plays Table

  ## Summary
  Drops and rebuilds the game_plays table with a complete schema designed to support
  trivia gameplay, scoring, and leaderboards. The existing table was confirmed empty
  and unused, making this a safe replacement.

  ## New Table: game_plays
  - `id` (uuid, PK) - Unique identifier
  - `campaign_id` (uuid, FK) - Parent campaign, CASCADE on delete
  - `campaign_game_instance_id` (uuid, FK) - Game instance, CASCADE on delete, NOT NULL
  - `client_id` (uuid, FK) - Denormalized for RLS, CASCADE on delete
  - `brand_id` (uuid, FK) - Denormalized for RLS, CASCADE on delete
  - `lead_id` (uuid, FK) - Player identity, SET NULL on delete (nullable for anonymous play)
  - `session_id` (text) - Browser/device session identifier
  - `game_system` (text) - Game type (trivia, spin, scratch, bizgamez)
  - `status` (text) - Play lifecycle (in_progress, completed, abandoned)
  - `score` (numeric) - Final score (numeric for weighted scoring)
  - `correct_answers` (integer) - Trivia-specific
  - `incorrect_answers` (integer) - Trivia-specific
  - `total_questions` (integer) - Trivia-specific
  - `completion_time_ms` (integer) - Time to complete
  - `scoring_mode` (text) - Mode used for this play
  - `is_win` (boolean) - Did player win/qualify
  - `eligible_for_reward` (boolean) - Qualifies for prize
  - `reward_label` (text) - Prize name if won
  - `played_at` (timestamptz) - When play started
  - `completed_at` (timestamptz) - When play finished
  - `ip_address` (inet) - For fraud detection
  - `user_agent` (text) - Device info
  - `geo_lat` (double precision) - Location if geofenced
  - `geo_lng` (double precision) - Location if geofenced
  - `metadata` (jsonb) - Extensible data

  ## Constraints
  - CHECK on status: in_progress, completed, abandoned
  - CHECK on game_system: trivia, spin, scratch, bizgamez
  - CHECK on scoring_mode (nullable)

  ## Indexes
  - Standard FK indexes for all foreign keys
  - Leaderboard indexes for campaign-wide and instance-level queries
  - Session lookup index

  ## Security
  - RLS enabled
  - Public INSERT allowed (rate limiting via Edge Function)
  - SELECT policies for admin/client users
*/

-- Drop existing game_plays table (confirmed empty)
DROP TABLE IF EXISTS game_plays CASCADE;

-- Create new game_plays table
CREATE TABLE game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_game_instance_id uuid NOT NULL REFERENCES campaign_game_instances(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  game_system text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  score numeric,
  correct_answers integer,
  incorrect_answers integer,
  total_questions integer,
  completion_time_ms integer,
  scoring_mode text,
  is_win boolean NOT NULL DEFAULT false,
  eligible_for_reward boolean NOT NULL DEFAULT false,
  reward_label text,
  played_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  ip_address inet,
  user_agent text,
  geo_lat double precision,
  geo_lng double precision,
  metadata jsonb DEFAULT '{}',
  
  -- CHECK constraints
  CONSTRAINT game_plays_status_check 
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  CONSTRAINT game_plays_game_system_check 
    CHECK (game_system IN ('trivia', 'spin', 'scratch', 'bizgamez')),
  CONSTRAINT game_plays_scoring_mode_check 
    CHECK (scoring_mode IS NULL OR scoring_mode IN ('accuracy_only', 'accuracy_speed_weighted', 'accuracy_then_fastest_time'))
);

-- Foreign key indexes
CREATE INDEX idx_gp_campaign_id ON game_plays (campaign_id);
CREATE INDEX idx_gp_instance_id ON game_plays (campaign_game_instance_id);
CREATE INDEX idx_gp_client_id ON game_plays (client_id);
CREATE INDEX idx_gp_brand_id ON game_plays (brand_id);
CREATE INDEX idx_gp_lead_id ON game_plays (lead_id);

-- Session and time indexes
CREATE INDEX idx_gp_session_id ON game_plays (session_id);
CREATE INDEX idx_gp_played_at ON game_plays (played_at DESC);

-- Leaderboard indexes (partial index for completed plays only)
CREATE INDEX idx_gp_campaign_leaderboard 
ON game_plays (campaign_id, score DESC, completion_time_ms ASC) 
WHERE status = 'completed';

CREATE INDEX idx_gp_instance_leaderboard 
ON game_plays (campaign_game_instance_id, score DESC, completion_time_ms ASC) 
WHERE status = 'completed';

-- Enable RLS
ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public inserts for anonymous gameplay (rate limiting via Edge Function)
CREATE POLICY "Allow public game play inserts"
ON game_plays
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- RLS Policy: Agency admins have full access
CREATE POLICY "Agency admins have full access to game plays"
ON game_plays
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

-- RLS Policy: Client admins can view their client's game plays
CREATE POLICY "Client admins can view their game plays"
ON game_plays
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.client_id = game_plays.client_id
    AND profiles.role = 'client_admin'
  )
);

-- RLS Policy: Client users can view game plays for their permitted brands
CREATE POLICY "Client users can view game plays for permitted brands"
ON game_plays
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_brand_permissions ubp ON ubp.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.client_id = game_plays.client_id
    AND ubp.brand_id = game_plays.brand_id
  )
);

-- RLS Policy: Players can view their own game plays by session
CREATE POLICY "Players can view their own game plays by session"
ON game_plays
FOR SELECT
TO anon, authenticated
USING (
  session_id = current_setting('request.headers', true)::json->>'x-session-id'
);

-- RLS Policy: Players can update their own game plays by session (for lead linking)
CREATE POLICY "Players can update their own game plays by session"
ON game_plays
FOR UPDATE
TO anon, authenticated
USING (
  session_id = current_setting('request.headers', true)::json->>'x-session-id'
)
WITH CHECK (
  session_id = current_setting('request.headers', true)::json->>'x-session-id'
);
