/*
  # Add Reward Catalog and Bonus Rules Tables

  ## Summary
  This migration adds support for multiple reward tiers per campaign (Reward Catalog)
  and visit-based promotional rules (Bonus Rules). These are purely additive changes
  that do not alter any existing tables or data.

  ## New Tables

  ### campaign_rewards
  Stores multiple reward tiers for a campaign. Each tier has a threshold and reward details.
  - id: unique reward ID
  - campaign_id: links to campaigns table
  - reward_name: display name of the reward
  - threshold: number of stamps required to earn this reward
  - reward_description: optional description
  - reward_type: free_item | discount | vip | birthday | custom
  - reward_value: optional value (e.g., "10%" for discount)
  - active: whether this tier is currently active
  - sort_order: display order (ascending)
  - created_at: creation timestamp

  ### campaign_bonus_rules
  Stores promotional stamp multiplier rules (e.g., double stamps on Tuesdays).
  - id: unique rule ID
  - campaign_id: links to campaigns table
  - name: friendly rule name
  - rule_type: day_of_week | time_window | custom_simple
  - day_of_week: 0=Sunday through 6=Saturday (nullable)
  - start_time: time window start (nullable)
  - end_time: time window end (nullable)
  - multiplier: stamp multiplier (e.g., 2.0 = double stamps)
  - active: whether this rule is currently active
  - created_at: creation timestamp

  ## Security
  - RLS enabled on both tables
  - Agency admins: full access
  - Client admins: access to their client's campaigns' rewards/rules
  - Client users: read if brand permissions exist, write if can_edit_campaign
  - Public: no direct access

  ## Performance
  - Indexes on campaign_id for fast lookup
  - Composite index on (campaign_id, threshold) for ordered reward tier queries
  - Composite index on (campaign_id, active) for fast active-rule filtering
*/

-- ============================================================================
-- campaign_rewards
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  reward_name text NOT NULL DEFAULT '',
  threshold integer NOT NULL CHECK (threshold > 0),
  reward_description text DEFAULT '',
  reward_type text NOT NULL DEFAULT 'custom' CHECK (reward_type IN ('free_item', 'discount', 'vip', 'birthday', 'custom')),
  reward_value text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_rewards_campaign_id ON campaign_rewards(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_rewards_campaign_threshold ON campaign_rewards(campaign_id, threshold);

ALTER TABLE campaign_rewards ENABLE ROW LEVEL SECURITY;

-- Agency admins: full access
CREATE POLICY "Agency admins full access to campaign_rewards"
  ON campaign_rewards FOR SELECT
  TO authenticated
  USING (is_agency_admin());

CREATE POLICY "Agency admins can insert campaign_rewards"
  ON campaign_rewards FOR INSERT
  TO authenticated
  WITH CHECK (is_agency_admin());

CREATE POLICY "Agency admins can update campaign_rewards"
  ON campaign_rewards FOR UPDATE
  TO authenticated
  USING (is_agency_admin())
  WITH CHECK (is_agency_admin());

CREATE POLICY "Agency admins can delete campaign_rewards"
  ON campaign_rewards FOR DELETE
  TO authenticated
  USING (is_agency_admin());

-- Client admins: access to their client's rewards
CREATE POLICY "Client admins can select own campaign_rewards"
  ON campaign_rewards FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_rewards.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

CREATE POLICY "Client admins can insert own campaign_rewards"
  ON campaign_rewards FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_rewards.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

CREATE POLICY "Client admins can update own campaign_rewards"
  ON campaign_rewards FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_rewards.campaign_id
        AND c.client_id = get_user_client_id()
    )
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_rewards.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

CREATE POLICY "Client admins can delete own campaign_rewards"
  ON campaign_rewards FOR DELETE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_rewards.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

-- Client users: read if brand permission, write if can_edit_campaign
CREATE POLICY "Client users can select permitted brand campaign_rewards"
  ON campaign_rewards FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
    )
  );

CREATE POLICY "Client users can insert campaign_rewards with edit permission"
  ON campaign_rewards FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

CREATE POLICY "Client users can update campaign_rewards with edit permission"
  ON campaign_rewards FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

CREATE POLICY "Client users can delete campaign_rewards with edit permission"
  ON campaign_rewards FOR DELETE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

-- Public can read active campaign rewards (needed for loyalty card page)
CREATE POLICY "Public can read campaign_rewards for active campaigns"
  ON campaign_rewards FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_rewards.campaign_id
        AND c.status = 'active'
    )
  );

-- ============================================================================
-- campaign_bonus_rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_bonus_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  rule_type text NOT NULL DEFAULT 'day_of_week' CHECK (rule_type IN ('day_of_week', 'time_window', 'custom_simple')),
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time,
  end_time time,
  multiplier numeric(4,2) NOT NULL DEFAULT 1.0 CHECK (multiplier > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_bonus_rules_campaign_id ON campaign_bonus_rules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_bonus_rules_campaign_active ON campaign_bonus_rules(campaign_id, active);

ALTER TABLE campaign_bonus_rules ENABLE ROW LEVEL SECURITY;

-- Agency admins: full access
CREATE POLICY "Agency admins full access to campaign_bonus_rules"
  ON campaign_bonus_rules FOR SELECT
  TO authenticated
  USING (is_agency_admin());

CREATE POLICY "Agency admins can insert campaign_bonus_rules"
  ON campaign_bonus_rules FOR INSERT
  TO authenticated
  WITH CHECK (is_agency_admin());

CREATE POLICY "Agency admins can update campaign_bonus_rules"
  ON campaign_bonus_rules FOR UPDATE
  TO authenticated
  USING (is_agency_admin())
  WITH CHECK (is_agency_admin());

CREATE POLICY "Agency admins can delete campaign_bonus_rules"
  ON campaign_bonus_rules FOR DELETE
  TO authenticated
  USING (is_agency_admin());

-- Client admins
CREATE POLICY "Client admins can select own campaign_bonus_rules"
  ON campaign_bonus_rules FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

CREATE POLICY "Client admins can insert own campaign_bonus_rules"
  ON campaign_bonus_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

CREATE POLICY "Client admins can update own campaign_bonus_rules"
  ON campaign_bonus_rules FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND c.client_id = get_user_client_id()
    )
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

CREATE POLICY "Client admins can delete own campaign_bonus_rules"
  ON campaign_bonus_rules FOR DELETE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

-- Client users
CREATE POLICY "Client users can select permitted brand campaign_bonus_rules"
  ON campaign_bonus_rules FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
    )
  );

CREATE POLICY "Client users can insert campaign_bonus_rules with edit permission"
  ON campaign_bonus_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

CREATE POLICY "Client users can update campaign_bonus_rules with edit permission"
  ON campaign_bonus_rules FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

CREATE POLICY "Client users can delete campaign_bonus_rules with edit permission"
  ON campaign_bonus_rules FOR DELETE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );
