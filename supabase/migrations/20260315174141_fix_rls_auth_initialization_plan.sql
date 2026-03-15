/*
  # Fix RLS Auth Initialization Plan

  ## Summary
  Replaces `auth.uid()` and `auth.jwt()` direct calls with `(SELECT auth.uid())`
  and `(SELECT auth.jwt())` in RLS policies. This causes Postgres to evaluate the
  function once per query rather than once per row, significantly improving
  performance at scale.

  ## Affected Tables and Policies
  - profiles: Service role can insert any profile, Client admins can update users in their client
  - brands: Client users can view assigned brands, Brand managers can update assigned brands
  - user_brand_permissions: Users can view own brand permissions
  - campaigns: Client users can view/create/update/delete permitted brand campaigns
  - campaign_rewards: Client users can select/insert/update/delete campaign_rewards
  - campaign_bonus_rules: Client users can select/insert/update/delete campaign_bonus_rules
  - campaign_insights_cache: Client users can read insights_cache for permitted brands
  - games: All agency admin and client admin policies
*/

-- ============================================================
-- profiles
-- ============================================================

DROP POLICY IF EXISTS "Service role can insert any profile" ON public.profiles;
CREATE POLICY "Service role can insert any profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

DROP POLICY IF EXISTS "Client admins can update users in their client" ON public.profiles;
CREATE POLICY "Client admins can update users in their client"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
    AND id != (SELECT auth.uid())
  )
  WITH CHECK (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
    AND id != (SELECT auth.uid())
  );

-- ============================================================
-- brands
-- ============================================================

DROP POLICY IF EXISTS "Client users can view assigned brands" ON public.brands;
CREATE POLICY "Client users can view assigned brands"
  ON public.brands FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.user_brand_permissions
      WHERE brand_id = brands.id
        AND user_id = (SELECT auth.uid())
        AND active = true
    )
  );

DROP POLICY IF EXISTS "Brand managers can update assigned brands" ON public.brands;
CREATE POLICY "Brand managers can update assigned brands"
  ON public.brands FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_brand_permissions
      WHERE brand_id = brands.id
        AND user_id = (SELECT auth.uid())
        AND is_brand_manager = true
        AND active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_brand_permissions
      WHERE brand_id = brands.id
        AND user_id = (SELECT auth.uid())
        AND is_brand_manager = true
        AND active = true
    )
  );

-- ============================================================
-- user_brand_permissions
-- ============================================================

DROP POLICY IF EXISTS "Users can view own brand permissions" ON public.user_brand_permissions;
CREATE POLICY "Users can view own brand permissions"
  ON public.user_brand_permissions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- campaigns
-- ============================================================

DROP POLICY IF EXISTS "Client users can view permitted brand campaigns" ON public.campaigns;
CREATE POLICY "Client users can view permitted brand campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.user_brand_permissions
      WHERE brand_id = campaigns.brand_id
        AND user_id = (SELECT auth.uid())
        AND active = true
    )
  );

DROP POLICY IF EXISTS "Client users can create campaigns for permitted brands" ON public.campaigns;
CREATE POLICY "Client users can create campaigns for permitted brands"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.user_brand_permissions
      WHERE brand_id = campaigns.brand_id
        AND user_id = (SELECT auth.uid())
        AND active = true
        AND can_add_campaign = true
    )
  );

DROP POLICY IF EXISTS "Client users can update permitted brand campaigns" ON public.campaigns;
CREATE POLICY "Client users can update permitted brand campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.user_brand_permissions
      WHERE brand_id = campaigns.brand_id
        AND user_id = (SELECT auth.uid())
        AND active = true
        AND can_edit_campaign = true
    )
  )
  WITH CHECK (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.user_brand_permissions
      WHERE brand_id = campaigns.brand_id
        AND user_id = (SELECT auth.uid())
        AND active = true
        AND can_edit_campaign = true
    )
  );

DROP POLICY IF EXISTS "Client users can delete permitted brand campaigns" ON public.campaigns;
CREATE POLICY "Client users can delete permitted brand campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.user_brand_permissions
      WHERE brand_id = campaigns.brand_id
        AND user_id = (SELECT auth.uid())
        AND active = true
        AND can_delete_campaign = true
    )
  );

-- ============================================================
-- campaign_rewards
-- ============================================================

DROP POLICY IF EXISTS "Client users can select permitted brand campaign_rewards" ON public.campaign_rewards;
CREATE POLICY "Client users can select permitted brand campaign_rewards"
  ON public.campaign_rewards FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
    )
  );

DROP POLICY IF EXISTS "Client users can insert campaign_rewards with edit permission" ON public.campaign_rewards;
CREATE POLICY "Client users can insert campaign_rewards with edit permission"
  ON public.campaign_rewards FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

DROP POLICY IF EXISTS "Client users can update campaign_rewards with edit permission" ON public.campaign_rewards;
CREATE POLICY "Client users can update campaign_rewards with edit permission"
  ON public.campaign_rewards FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  )
  WITH CHECK (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

DROP POLICY IF EXISTS "Client users can delete campaign_rewards with edit permission" ON public.campaign_rewards;
CREATE POLICY "Client users can delete campaign_rewards with edit permission"
  ON public.campaign_rewards FOR DELETE
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_rewards.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

-- ============================================================
-- campaign_bonus_rules
-- ============================================================

DROP POLICY IF EXISTS "Client users can select permitted brand campaign_bonus_rules" ON public.campaign_bonus_rules;
CREATE POLICY "Client users can select permitted brand campaign_bonus_rules"
  ON public.campaign_bonus_rules FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
    )
  );

DROP POLICY IF EXISTS "Client users can insert campaign_bonus_rules with edit permissi" ON public.campaign_bonus_rules;
CREATE POLICY "Client users can insert campaign_bonus_rules with edit permissi"
  ON public.campaign_bonus_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

DROP POLICY IF EXISTS "Client users can update campaign_bonus_rules with edit permissi" ON public.campaign_bonus_rules;
CREATE POLICY "Client users can update campaign_bonus_rules with edit permissi"
  ON public.campaign_bonus_rules FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  )
  WITH CHECK (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

DROP POLICY IF EXISTS "Client users can delete campaign_bonus_rules with edit permissi" ON public.campaign_bonus_rules;
CREATE POLICY "Client users can delete campaign_bonus_rules with edit permissi"
  ON public.campaign_bonus_rules FOR DELETE
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
      WHERE c.id = campaign_bonus_rules.campaign_id
        AND ubp.user_id = (SELECT auth.uid())
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

-- ============================================================
-- campaign_insights_cache
-- ============================================================

DROP POLICY IF EXISTS "Client users can read insights_cache for permitted brands" ON public.campaign_insights_cache;
CREATE POLICY "Client users can read insights_cache for permitted brands"
  ON public.campaign_insights_cache FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND (
      (scope_type = 'brand' AND EXISTS (
        SELECT 1 FROM public.user_brand_permissions ubp
        WHERE ubp.brand_id = campaign_insights_cache.scope_id
          AND ubp.user_id = (SELECT auth.uid())
          AND ubp.active = true
          AND ubp.can_view_stats = true
      ))
      OR
      (scope_type = 'campaign' AND EXISTS (
        SELECT 1 FROM public.campaigns c
        JOIN public.user_brand_permissions ubp ON ubp.brand_id = c.brand_id
        WHERE c.id = campaign_insights_cache.scope_id
          AND ubp.user_id = (SELECT auth.uid())
          AND ubp.active = true
          AND ubp.can_view_stats = true
      ))
    )
  );

-- ============================================================
-- games (already use subqueries but need auth.uid() wrapped)
-- ============================================================

DROP POLICY IF EXISTS "Agency admins can select all games" ON public.games;
CREATE POLICY "Agency admins can select all games"
  ON public.games FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Agency admins can insert games" ON public.games;
CREATE POLICY "Agency admins can insert games"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Agency admins can update all games" ON public.games;
CREATE POLICY "Agency admins can update all games"
  ON public.games FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Agency admins can delete all games" ON public.games;
CREATE POLICY "Agency admins can delete all games"
  ON public.games FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Client admins can select their games" ON public.games;
CREATE POLICY "Client admins can select their games"
  ON public.games FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Client admins can insert their games" ON public.games;
CREATE POLICY "Client admins can insert their games"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Client admins can update their games" ON public.games;
CREATE POLICY "Client admins can update their games"
  ON public.games FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Client admins can delete their games" ON public.games;
CREATE POLICY "Client admins can delete their games"
  ON public.games FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  );
