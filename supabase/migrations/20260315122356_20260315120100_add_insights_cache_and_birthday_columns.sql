/*
  # Add Campaign Insights Cache and Birthday Support

  ## Summary
  This migration adds the dedicated insights cache table and additive columns to
  support birthday rewards and enhanced loyalty progress tracking.

  ## New Tables

  ### campaign_insights_cache
  Stores pre-computed analytics insights at campaign, brand, or client scope.
  Refreshed once per day or on demand.
  - scope_type: 'campaign' | 'brand' | 'client'
  - scope_id: the relevant campaign_id, brand_id, or client_id
  - data: jsonb blob with all computed insight values
  - computed_at: when the cache was last computed
  - next_refresh_at: when it will next auto-refresh (computed_at + 24h)

  ## Modified Tables

  ### loyalty_programs
  - birthday_reward_enabled (boolean, default false): opt-in birthday rewards
  - birthday_reward_name (text, nullable): name of birthday reward
  - birthday_reward_description (text, nullable): description of birthday reward

  ### loyalty_accounts
  - birthday (date, nullable): member's birthday (month/day stored as full date with year 2000)

  ### loyalty_progress_log
  - stamp_value (integer, default 1): actual stamp value applied (may differ from 1 if bonus rule applied)
  - bonus_rule_id (uuid, nullable): FK to campaign_bonus_rules if a bonus was applied

  ### loyalty_redemptions
  - redemption_source (text, default 'standard'): 'standard' or 'birthday'
  - reward_tier_id (uuid, nullable): FK to campaign_rewards to identify which tier was redeemed

  ## Security
  - RLS enabled on campaign_insights_cache
  - Agency admins: full access
  - Client admins: read their client scope, no direct write (service role writes)
  - Client users: read if can_view_stats for brand, no write

  ## Performance
  - Index on loyalty_accounts.birthday for birthday-month queries
  - Unique constraint on campaign_insights_cache (scope_type, scope_id) for upserts
  - Index on loyalty_redemptions.redemption_source for birthday analytics
*/

-- ============================================================================
-- campaign_insights_cache
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('campaign', 'brand', 'client')),
  scope_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now(),
  next_refresh_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_cache_scope ON campaign_insights_cache(scope_type, scope_id);

ALTER TABLE campaign_insights_cache ENABLE ROW LEVEL SECURITY;

-- Agency admins: full access
CREATE POLICY "Agency admins full access to insights_cache"
  ON campaign_insights_cache FOR SELECT
  TO authenticated
  USING (is_agency_admin());

CREATE POLICY "Agency admins can insert insights_cache"
  ON campaign_insights_cache FOR INSERT
  TO authenticated
  WITH CHECK (is_agency_admin());

CREATE POLICY "Agency admins can update insights_cache"
  ON campaign_insights_cache FOR UPDATE
  TO authenticated
  USING (is_agency_admin())
  WITH CHECK (is_agency_admin());

CREATE POLICY "Agency admins can delete insights_cache"
  ON campaign_insights_cache FOR DELETE
  TO authenticated
  USING (is_agency_admin());

-- Client admins: read where scope resolves to their client
CREATE POLICY "Client admins can read their insights_cache"
  ON campaign_insights_cache FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND (
      -- client scope: scope_id is their client_id
      (scope_type = 'client' AND scope_id = get_user_client_id())
      OR
      -- brand scope: scope_id is a brand belonging to their client
      (scope_type = 'brand' AND EXISTS (
        SELECT 1 FROM brands b WHERE b.id = scope_id AND b.client_id = get_user_client_id()
      ))
      OR
      -- campaign scope: scope_id is a campaign belonging to their client
      (scope_type = 'campaign' AND EXISTS (
        SELECT 1 FROM campaigns c WHERE c.id = scope_id AND c.client_id = get_user_client_id()
      ))
    )
  );

-- Client users: read if they have can_view_stats for the relevant brand
CREATE POLICY "Client users can read insights_cache for permitted brands"
  ON campaign_insights_cache FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND (
      -- brand scope
      (scope_type = 'brand' AND EXISTS (
        SELECT 1 FROM user_brand_permissions ubp
        WHERE ubp.brand_id = scope_id
          AND ubp.user_id = auth.uid()
          AND ubp.active = true
          AND ubp.can_view_stats = true
      ))
      OR
      -- campaign scope
      (scope_type = 'campaign' AND EXISTS (
        SELECT 1 FROM campaigns c
        JOIN user_brand_permissions ubp ON ubp.brand_id = c.brand_id
        WHERE c.id = scope_id
          AND ubp.user_id = auth.uid()
          AND ubp.active = true
          AND ubp.can_view_stats = true
      ))
    )
  );

-- ============================================================================
-- loyalty_programs: add birthday reward columns
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_programs' AND column_name = 'birthday_reward_enabled'
  ) THEN
    ALTER TABLE loyalty_programs ADD COLUMN birthday_reward_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_programs' AND column_name = 'birthday_reward_name'
  ) THEN
    ALTER TABLE loyalty_programs ADD COLUMN birthday_reward_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_programs' AND column_name = 'birthday_reward_description'
  ) THEN
    ALTER TABLE loyalty_programs ADD COLUMN birthday_reward_description text;
  END IF;
END $$;

-- ============================================================================
-- loyalty_accounts: add birthday column
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_accounts' AND column_name = 'birthday'
  ) THEN
    ALTER TABLE loyalty_accounts ADD COLUMN birthday date;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_birthday ON loyalty_accounts(birthday);

-- ============================================================================
-- loyalty_progress_log: add stamp tracking columns
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_progress_log' AND column_name = 'stamp_value'
  ) THEN
    ALTER TABLE loyalty_progress_log ADD COLUMN stamp_value integer NOT NULL DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_progress_log' AND column_name = 'bonus_rule_id'
  ) THEN
    ALTER TABLE loyalty_progress_log ADD COLUMN bonus_rule_id uuid REFERENCES campaign_bonus_rules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- loyalty_redemptions: add redemption source and tier tracking
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_redemptions' AND column_name = 'redemption_source'
  ) THEN
    ALTER TABLE loyalty_redemptions ADD COLUMN redemption_source text NOT NULL DEFAULT 'standard' CHECK (redemption_source IN ('standard', 'birthday'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_redemptions' AND column_name = 'reward_tier_id'
  ) THEN
    ALTER TABLE loyalty_redemptions ADD COLUMN reward_tier_id uuid REFERENCES campaign_rewards(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_source ON loyalty_redemptions(redemption_source);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_tier ON loyalty_redemptions(reward_tier_id);
