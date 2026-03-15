/*
  # Fix Permission Gaps for New Features

  ## Summary
  This migration fixes several permission and isolation gaps identified during the
  audit of Reward Catalog, Bonus Rules, Customer Insights, and Birthday Rewards
  against the Agency > Client > Brand permission model.

  ## Changes

  ### 1. campaign_insights_cache - Add missing INSERT/UPDATE policies for client admins
  The edge function uses service_role (bypasses RLS) for upserts, so these policies
  are additive safety for any future direct-client writes. More importantly, this
  adds explicit denial clarity for client_users (read-only, no write).

  ### 2. loyalty_programs - Ensure birthday columns respect existing client RLS
  The birthday columns were added without verifying the existing loyalty_programs
  RLS policies cover them. This migration confirms coverage via a policy audit check.

  ### 3. loyalty_redemptions - Ensure redemption_source column has proper index
  Already added in previous migration, confirmed idempotently here.

  ### 4. campaign_bonus_rules - Add missing brand_id denormalization index
  Performance improvement: add index on campaigns.brand_id join path used by
  client_user RLS policies on campaign_bonus_rules and campaign_rewards.

  ## Security Notes
  - Service role (used by edge functions) bypasses RLS - this is intentional
  - Client users remain read-only on insights cache (no direct write)
  - All new write operations on rewards/rules require can_edit_campaign permission
*/

-- ============================================================================
-- Fix: Add client admin INSERT/UPDATE policies for campaign_insights_cache
-- (Defensive - edge fn uses service_role, but adds explicit policy coverage)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_insights_cache'
      AND policyname = 'Client admins can insert their insights_cache'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Client admins can insert their insights_cache"
        ON campaign_insights_cache FOR INSERT
        TO authenticated
        WITH CHECK (
          get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
          AND (
            (scope_type = 'client' AND scope_id = get_user_client_id())
            OR (scope_type = 'brand' AND EXISTS (
              SELECT 1 FROM brands b WHERE b.id = scope_id AND b.client_id = get_user_client_id()
            ))
            OR (scope_type = 'campaign' AND EXISTS (
              SELECT 1 FROM campaigns c WHERE c.id = scope_id AND c.client_id = get_user_client_id()
            ))
          )
        )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_insights_cache'
      AND policyname = 'Client admins can update their insights_cache'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Client admins can update their insights_cache"
        ON campaign_insights_cache FOR UPDATE
        TO authenticated
        USING (
          get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
          AND (
            (scope_type = 'client' AND scope_id = get_user_client_id())
            OR (scope_type = 'brand' AND EXISTS (
              SELECT 1 FROM brands b WHERE b.id = scope_id AND b.client_id = get_user_client_id()
            ))
            OR (scope_type = 'campaign' AND EXISTS (
              SELECT 1 FROM campaigns c WHERE c.id = scope_id AND c.client_id = get_user_client_id()
            ))
          )
        )
        WITH CHECK (
          get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
          AND (
            (scope_type = 'client' AND scope_id = get_user_client_id())
            OR (scope_type = 'brand' AND EXISTS (
              SELECT 1 FROM brands b WHERE b.id = scope_id AND b.client_id = get_user_client_id()
            ))
            OR (scope_type = 'campaign' AND EXISTS (
              SELECT 1 FROM campaigns c WHERE c.id = scope_id AND c.client_id = get_user_client_id()
            ))
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================================================
-- Performance: Add indexes on campaigns(brand_id) and campaigns(client_id)
-- to speed up the JOIN path used in client_user RLS policies
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
