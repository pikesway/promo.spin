/*
  # Fix Security and Performance Issues

  1. Missing Foreign Key Indexes
    - Add index on loyalty_device_tokens.campaign_id
    - Add index on loyalty_progress_log.validated_by
    - Add index on loyalty_redemptions.redeemed_by
    - Add index on validation_attempts.campaign_id
    - Add index on validation_lockouts.campaign_id
    - Add index on validation_lockouts.unlocked_by

  2. RLS Policy Optimization
    - Update profiles policies to use (select auth.uid()) for better performance
    - Update webhook_events policies to use (select auth.uid())
    - Update leads policies to use (select auth.uid())

  3. Consolidate Duplicate Policies
    - Remove duplicate policies on agencies, campaigns, clients, game_plays,
      leads, loyalty_accounts, prize_inventory, profiles, redemptions, webhook_events

  4. Function Search Path Security
    - Add SET search_path = '' to all functions for security

  5. Notes
    - Some "always true" RLS policies are intentional for public-facing features
    - Unused indexes are kept for future scalability
    - Leaked password protection requires dashboard configuration
*/

-- =============================================================================
-- PART 1: Add Missing Foreign Key Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_loyalty_device_tokens_campaign_id
  ON loyalty_device_tokens(campaign_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_progress_log_validated_by
  ON loyalty_progress_log(validated_by);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_redeemed_by
  ON loyalty_redemptions(redeemed_by);

CREATE INDEX IF NOT EXISTS idx_validation_attempts_campaign_id
  ON validation_attempts(campaign_id);

CREATE INDEX IF NOT EXISTS idx_validation_lockouts_campaign_id
  ON validation_lockouts(campaign_id);

CREATE INDEX IF NOT EXISTS idx_validation_lockouts_unlocked_by
  ON validation_lockouts(unlocked_by);

-- =============================================================================
-- PART 2: Optimize RLS Policies with (select auth.uid())
-- =============================================================================

-- Drop and recreate profiles policies with optimized auth calls
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Drop and recreate webhook_events policies with optimized auth calls
DROP POLICY IF EXISTS "Users can view own client webhook events" ON webhook_events;
DROP POLICY IF EXISTS "Admins can view all webhook events" ON webhook_events;

CREATE POLICY "Users can view own client webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT client_id FROM profiles WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- Drop and recreate leads policies with optimized auth calls
DROP POLICY IF EXISTS "Admins can view all leads" ON leads;

CREATE POLICY "Admins can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- =============================================================================
-- PART 3: Consolidate Duplicate Permissive Policies
-- =============================================================================

-- AGENCIES: Remove duplicate policies, keep admin versions
DROP POLICY IF EXISTS "Users can view agencies" ON agencies;
DROP POLICY IF EXISTS "Users can create agencies" ON agencies;
DROP POLICY IF EXISTS "Users can update agencies" ON agencies;
DROP POLICY IF EXISTS "Users can delete agencies" ON agencies;

-- CAMPAIGNS: Remove duplicate policies, keep admin versions
DROP POLICY IF EXISTS "Users can view own client campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can delete campaigns" ON campaigns;

-- Update admin policies to include client users
DROP POLICY IF EXISTS "Admins can view all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can insert campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON campaigns;

CREATE POLICY "Authenticated users can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = campaigns.client_id
      )
    )
  );

CREATE POLICY "Authenticated users can insert campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = campaigns.client_id
      )
    )
  );

CREATE POLICY "Authenticated users can update campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = campaigns.client_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = campaigns.client_id
      )
    )
  );

CREATE POLICY "Authenticated users can delete campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = campaigns.client_id
      )
    )
  );

-- CLIENTS: Remove duplicate policies
DROP POLICY IF EXISTS "Users can view clients" ON clients;
DROP POLICY IF EXISTS "Users can view own client" ON clients;
DROP POLICY IF EXISTS "Users can create clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON clients;
DROP POLICY IF EXISTS "Admins can update clients" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;

CREATE POLICY "Authenticated users can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = clients.id
      )
    )
  );

CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = clients.id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = clients.id
      )
    )
  );

CREATE POLICY "Authenticated users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- GAME_PLAYS: Remove duplicate policies
DROP POLICY IF EXISTS "Anyone can insert game plays" ON game_plays;
DROP POLICY IF EXISTS "Anyone can view game plays" ON game_plays;
DROP POLICY IF EXISTS "Admins can view all game plays" ON game_plays;
DROP POLICY IF EXISTS "Users can view own client game plays" ON game_plays;

CREATE POLICY "Authenticated users can view game plays"
  ON game_plays FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id IN (SELECT client_id FROM campaigns WHERE campaigns.id = game_plays.campaign_id)
      )
    )
  );

-- LEADS: Remove duplicate policies
DROP POLICY IF EXISTS "Users can view own client leads" ON leads;

CREATE POLICY "Authenticated users can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = leads.client_id
      )
    )
  );

-- LOYALTY_ACCOUNTS: Remove duplicate update policies
DROP POLICY IF EXISTS "Anyone can update loyalty accounts" ON loyalty_accounts;
DROP POLICY IF EXISTS "Authenticated users can update loyalty accounts" ON loyalty_accounts;

CREATE POLICY "Anyone can update loyalty accounts"
  ON loyalty_accounts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- PRIZE_INVENTORY: Remove duplicate policies
DROP POLICY IF EXISTS "Users can view prize inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Users can create prize inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Users can update prize inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Users can delete prize inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Admins can view all inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Admins can insert inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Admins can update inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Admins can delete inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Users can view own client inventory" ON prize_inventory;

CREATE POLICY "Authenticated users can view prize inventory"
  ON prize_inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id IN (SELECT client_id FROM campaigns WHERE campaigns.id = prize_inventory.campaign_id)
      )
    )
  );

CREATE POLICY "Authenticated users can insert prize inventory"
  ON prize_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id IN (SELECT client_id FROM campaigns WHERE campaigns.id = prize_inventory.campaign_id)
      )
    )
  );

CREATE POLICY "Authenticated users can update prize inventory"
  ON prize_inventory FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id IN (SELECT client_id FROM campaigns WHERE campaigns.id = prize_inventory.campaign_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id IN (SELECT client_id FROM campaigns WHERE campaigns.id = prize_inventory.campaign_id)
      )
    )
  );

CREATE POLICY "Authenticated users can delete prize inventory"
  ON prize_inventory FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id IN (SELECT client_id FROM campaigns WHERE campaigns.id = prize_inventory.campaign_id)
      )
    )
  );

-- PROFILES: Remove duplicate policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND p.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND p.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND p.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND p.role IN ('super_admin', 'admin')
    )
  );

-- REDEMPTIONS: Remove duplicate policies
DROP POLICY IF EXISTS "Users can view redemptions" ON redemptions;
DROP POLICY IF EXISTS "Users can update redemptions" ON redemptions;
DROP POLICY IF EXISTS "Users can view own client redemptions" ON redemptions;
DROP POLICY IF EXISTS "Admins can view all redemptions" ON redemptions;
DROP POLICY IF EXISTS "Admins can update redemptions" ON redemptions;
DROP POLICY IF EXISTS "Public can update redemptions" ON redemptions;

CREATE POLICY "Authenticated users can view redemptions"
  ON redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = redemptions.client_id
      )
    )
  );

CREATE POLICY "Authenticated users can update redemptions"
  ON redemptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = redemptions.client_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('super_admin', 'admin')
        OR client_id = redemptions.client_id
      )
    )
  );

-- =============================================================================
-- PART 4: Fix Function Search Paths
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_loyalty_short_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid();
$$;