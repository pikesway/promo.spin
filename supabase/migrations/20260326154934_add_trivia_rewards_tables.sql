/*
  # Trivia Rewards System Tables

  1. New Tables
    - `trivia_rewards`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, FK to campaigns)
      - `instance_id` (uuid, FK to campaign_game_instances, nullable for campaign-level)
      - `scope` (text: 'campaign' | 'instance')
      - `rank_min` (int) - start of rank range
      - `rank_max` (int) - end of rank range
      - `reward_name` (text)
      - `reward_description` (text, nullable)
      - `reward_value` (text, nullable)
      - `fulfillment_method` (text: 'manual' | 'platform')
      - `quantity_limit` (int, nullable)
      - `active` (boolean, default true)
      - `created_at` (timestamptz)

    - `trivia_reward_assignments`
      - `id` (uuid, primary key)
      - `trivia_reward_id` (uuid, FK to trivia_rewards)
      - `lead_id` (uuid, FK to leads)
      - `game_play_id` (uuid, FK to game_plays, nullable)
      - `instance_id` (uuid, FK to campaign_game_instances, nullable)
      - `campaign_id` (uuid, FK to campaigns)
      - `rank_achieved` (int)
      - `score_achieved` (numeric) - using numeric for precision
      - `status` (text: 'pending' | 'issued' | 'fulfilled')
      - `issued_at` (timestamptz, nullable)
      - `fulfilled_at` (timestamptz, nullable)
      - `issued_by` (uuid, FK to profiles, nullable)
      - `redemption_id` (uuid, FK to redemptions, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Policies follow existing campaign access patterns
    - Admins can manage all
    - Client admins/users can manage within their client scope

  3. Indexes
    - Performance indexes for leaderboard queries
    - Foreign key indexes for joins
*/

-- Create trivia_rewards table
CREATE TABLE IF NOT EXISTS trivia_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES campaign_game_instances(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('campaign', 'instance')),
  rank_min int NOT NULL CHECK (rank_min > 0),
  rank_max int NOT NULL CHECK (rank_max >= rank_min),
  reward_name text NOT NULL DEFAULT '',
  reward_description text,
  reward_value text,
  fulfillment_method text NOT NULL DEFAULT 'manual' CHECK (fulfillment_method IN ('manual', 'platform')),
  quantity_limit int CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT trivia_rewards_scope_instance_check CHECK (
    (scope = 'campaign' AND instance_id IS NULL) OR
    (scope = 'instance' AND instance_id IS NOT NULL)
  )
);

-- Create trivia_reward_assignments table
CREATE TABLE IF NOT EXISTS trivia_reward_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trivia_reward_id uuid NOT NULL REFERENCES trivia_rewards(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  game_play_id uuid REFERENCES game_plays(id) ON DELETE SET NULL,
  instance_id uuid REFERENCES campaign_game_instances(id) ON DELETE SET NULL,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  rank_achieved int NOT NULL CHECK (rank_achieved > 0),
  score_achieved numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'issued', 'fulfilled')),
  issued_at timestamptz,
  fulfilled_at timestamptz,
  issued_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  redemption_id uuid REFERENCES redemptions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_reward_lead_instance UNIQUE (trivia_reward_id, lead_id, instance_id),
  CONSTRAINT unique_reward_lead_campaign UNIQUE (trivia_reward_id, lead_id, campaign_id) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trivia_rewards_campaign ON trivia_rewards(campaign_id);
CREATE INDEX IF NOT EXISTS idx_trivia_rewards_instance ON trivia_rewards(instance_id) WHERE instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trivia_rewards_scope ON trivia_rewards(scope, active);

CREATE INDEX IF NOT EXISTS idx_trivia_reward_assignments_campaign ON trivia_reward_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_trivia_reward_assignments_instance ON trivia_reward_assignments(instance_id) WHERE instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trivia_reward_assignments_lead ON trivia_reward_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_trivia_reward_assignments_status ON trivia_reward_assignments(status);
CREATE INDEX IF NOT EXISTS idx_trivia_reward_assignments_reward ON trivia_reward_assignments(trivia_reward_id);

-- Enable RLS
ALTER TABLE trivia_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_reward_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trivia_rewards
-- Admins can do everything
CREATE POLICY "Admins can manage all trivia rewards"
  ON trivia_rewards FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Client admins can manage rewards for their client's campaigns
CREATE POLICY "Client admins can manage their trivia rewards"
  ON trivia_rewards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = trivia_rewards.campaign_id
        AND c.client_id = p.client_id
        AND p.role = 'client_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = trivia_rewards.campaign_id
        AND c.client_id = p.client_id
        AND p.role = 'client_admin'
    )
  );

-- Client users with brand permission can view trivia rewards
CREATE POLICY "Client users can view trivia rewards for permitted brands"
  ON trivia_rewards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN profiles p ON p.id = auth.uid()
      JOIN user_brand_permissions ubp ON ubp.user_id = p.id AND ubp.brand_id = c.brand_id
      WHERE c.id = trivia_rewards.campaign_id
        AND c.client_id = p.client_id
        AND p.role = 'client_user'
        AND ubp.active = true
    )
  );

-- RLS Policies for trivia_reward_assignments
-- Admins can do everything
CREATE POLICY "Admins can manage all trivia reward assignments"
  ON trivia_reward_assignments FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Client admins can manage assignments for their client's campaigns
CREATE POLICY "Client admins can manage their trivia reward assignments"
  ON trivia_reward_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = trivia_reward_assignments.campaign_id
        AND c.client_id = p.client_id
        AND p.role = 'client_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = trivia_reward_assignments.campaign_id
        AND c.client_id = p.client_id
        AND p.role = 'client_admin'
    )
  );

-- Client users with brand permission can view assignments
CREATE POLICY "Client users can view trivia reward assignments for permitted brands"
  ON trivia_reward_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN profiles p ON p.id = auth.uid()
      JOIN user_brand_permissions ubp ON ubp.user_id = p.id AND ubp.brand_id = c.brand_id
      WHERE c.id = trivia_reward_assignments.campaign_id
        AND c.client_id = p.client_id
        AND p.role = 'client_user'
        AND ubp.active = true
    )
  );
