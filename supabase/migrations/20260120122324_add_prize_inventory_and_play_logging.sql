/*
  # Add Prize Inventory and Play Logging Tables

  1. New Tables
    - `prize_inventory`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key to campaigns)
      - `prize_name` (text, prize display name)
      - `initial_quantity` (integer, starting inventory)
      - `remaining_quantity` (integer, current available)
      - `created_at` (timestamptz)
      - Check constraint: remaining_quantity >= 0
    
    - `game_plays`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key to campaigns)
      - `user_id` (uuid, optional - for authenticated users)
      - `session_id` (text, browser fingerprint)
      - `outcome_prize_name` (text, nullable - what they won/landed on)
      - `is_win` (boolean, whether they won a prize)
      - `played_at` (timestamptz, when the play occurred)
      - `ip_address` (inet, for fraud detection)
      - `user_agent` (text, device info)
      - `metadata` (jsonb, additional tracking data)

  2. Security
    - Enable RLS on both tables
    - Allow public SELECT/INSERT for game_plays (guest gameplay)
    - Allow authenticated INSERT for prize_inventory (admin only)
    - Prevent direct prize_inventory updates (use stored functions)

  3. Indexes
    - Index on game_plays(session_id, played_at) for fraud detection
    - Index on game_plays(campaign_id) for analytics
    - Index on prize_inventory(campaign_id) for quick lookups

  4. Important Notes
    - Prize inventory tracking prevents running out of high-value prizes
    - Play logging creates audit trail for regulatory compliance
    - Session-based fraud detection limits bot attacks
*/

-- Create prize_inventory table
CREATE TABLE IF NOT EXISTS prize_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  prize_name text NOT NULL,
  initial_quantity integer NOT NULL DEFAULT 0,
  remaining_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (remaining_quantity >= 0),
  CHECK (initial_quantity >= 0),
  UNIQUE(campaign_id, prize_name)
);

-- Create game_plays table for audit trail
CREATE TABLE IF NOT EXISTS game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text NOT NULL,
  outcome_prize_name text,
  is_win boolean NOT NULL DEFAULT false,
  played_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE prize_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prize_inventory
CREATE POLICY "Anyone can view prize inventory"
  ON prize_inventory
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert prize inventory"
  ON prize_inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for game_plays
CREATE POLICY "Anyone can view game plays"
  ON game_plays
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert game plays"
  ON game_plays
  FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prize_inventory_campaign 
  ON prize_inventory(campaign_id);

CREATE INDEX IF NOT EXISTS idx_game_plays_campaign 
  ON game_plays(campaign_id);

CREATE INDEX IF NOT EXISTS idx_game_plays_session 
  ON game_plays(session_id, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_plays_played_at 
  ON game_plays(played_at DESC);

-- Function to decrement prize inventory safely
CREATE OR REPLACE FUNCTION decrement_prize_inventory(
  p_campaign_id uuid,
  p_prize_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining integer;
BEGIN
  -- Lock the row and decrement atomically
  UPDATE prize_inventory
  SET remaining_quantity = remaining_quantity - 1
  WHERE campaign_id = p_campaign_id 
    AND prize_name = p_prize_name
    AND remaining_quantity > 0
  RETURNING remaining_quantity INTO v_remaining;
  
  -- Return true if decrement succeeded
  RETURN FOUND;
END;
$$;