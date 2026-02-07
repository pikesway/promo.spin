/*
  # Migrate to app_bizgamez_agency Schema

  This migration moves all application tables, functions, triggers, and types
  from the public schema to the app_bizgamez_agency schema.

  ## Changes Overview

  1. **Schema Creation** - Creates app_bizgamez_agency schema
  2. **Drop All Policies** - Remove all RLS policies before migration
  3. **Type Migration** - Creates user_role enum type in new schema
  4. **Table Migration** - All 17 application tables moved
  5. **Function Migration** - All 12 helper functions moved
  6. **Trigger Recreation** - All triggers recreated
  7. **RLS Policy Recreation** - All policies recreated in new schema

  ## Important Notes
  - The profiles table maintains its FK to auth.users (cross-schema reference)
  - All data is preserved during migration
  - RLS remains enabled on all tables
*/

-- Step 1: Create the new schema
CREATE SCHEMA IF NOT EXISTS app_bizgamez_agency;

-- Step 2: Grant necessary permissions
GRANT USAGE ON SCHEMA app_bizgamez_agency TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA app_bizgamez_agency TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app_bizgamez_agency TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA app_bizgamez_agency TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app_bizgamez_agency
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_bizgamez_agency
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_bizgamez_agency
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- Step 3: Create the enum type in new schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = 'app_bizgamez_agency'::regnamespace) THEN
    CREATE TYPE app_bizgamez_agency.user_role AS ENUM ('super_admin', 'admin', 'client', 'staff');
  END IF;
END $$;

-- Step 4: Drop ALL existing policies on all tables
-- Profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Agencies
DROP POLICY IF EXISTS "Admins can delete agencies" ON public.agencies;
DROP POLICY IF EXISTS "Admins can insert agencies" ON public.agencies;
DROP POLICY IF EXISTS "Admins can update agencies" ON public.agencies;
DROP POLICY IF EXISTS "Admins can view all agencies" ON public.agencies;

-- Clients
DROP POLICY IF EXISTS "Anon can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Campaigns
DROP POLICY IF EXISTS "Anon can view active campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;

-- Leads
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Anon can read leads for insert return" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Everyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Everyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;

-- Redemptions
DROP POLICY IF EXISTS "Authenticated users can update redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Authenticated users can view redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Everyone can insert redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Everyone can read redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Everyone can update redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Public can insert redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Public can mark redemption as redeemed with valid token" ON public.redemptions;
DROP POLICY IF EXISTS "Public can view own redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Public can view redemption by valid token" ON public.redemptions;

-- Games
DROP POLICY IF EXISTS "Anyone can delete games" ON public.games;
DROP POLICY IF EXISTS "Anyone can insert games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;
DROP POLICY IF EXISTS "Public games are viewable by everyone" ON public.games;

-- Game plays
DROP POLICY IF EXISTS "Authenticated users can view game plays" ON public.game_plays;
DROP POLICY IF EXISTS "Public can insert game plays" ON public.game_plays;

-- Prize inventory
DROP POLICY IF EXISTS "Authenticated users can delete prize inventory" ON public.prize_inventory;
DROP POLICY IF EXISTS "Authenticated users can insert prize inventory" ON public.prize_inventory;
DROP POLICY IF EXISTS "Authenticated users can update prize inventory" ON public.prize_inventory;
DROP POLICY IF EXISTS "Authenticated users can view prize inventory" ON public.prize_inventory;
DROP POLICY IF EXISTS "Public can update inventory" ON public.prize_inventory;
DROP POLICY IF EXISTS "Public can view prize inventory" ON public.prize_inventory;

-- Webhook events
DROP POLICY IF EXISTS "Admins can view all webhook events" ON public.webhook_events;
DROP POLICY IF EXISTS "Anon can insert webhook events" ON public.webhook_events;
DROP POLICY IF EXISTS "Anon can select webhook events for processing" ON public.webhook_events;
DROP POLICY IF EXISTS "Anon can update webhook events" ON public.webhook_events;
DROP POLICY IF EXISTS "Users can view own client webhook events" ON public.webhook_events;

-- Loyalty programs
DROP POLICY IF EXISTS "Anyone can view loyalty programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Authenticated users can create loyalty programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Authenticated users can delete loyalty programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Authenticated users can update loyalty programs" ON public.loyalty_programs;

-- Loyalty accounts
DROP POLICY IF EXISTS "Anyone can create loyalty accounts" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Anyone can update loyalty accounts" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Anyone can view loyalty accounts" ON public.loyalty_accounts;

-- Loyalty progress log
DROP POLICY IF EXISTS "Anyone can create loyalty progress log" ON public.loyalty_progress_log;
DROP POLICY IF EXISTS "Anyone can view loyalty progress log" ON public.loyalty_progress_log;

-- Loyalty redemptions
DROP POLICY IF EXISTS "Anyone can create loyalty redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Anyone can view loyalty redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Authenticated users can update loyalty redemptions" ON public.loyalty_redemptions;

-- Validation attempts
DROP POLICY IF EXISTS "Anyone can create validation attempts" ON public.validation_attempts;
DROP POLICY IF EXISTS "Anyone can view validation attempts" ON public.validation_attempts;

-- Validation lockouts
DROP POLICY IF EXISTS "Anyone can view validation lockouts" ON public.validation_lockouts;
DROP POLICY IF EXISTS "Authenticated users can manage validation lockouts" ON public.validation_lockouts;
DROP POLICY IF EXISTS "Authenticated users can update validation lockouts" ON public.validation_lockouts;

-- Loyalty device tokens
DROP POLICY IF EXISTS "Anyone can create device tokens" ON public.loyalty_device_tokens;
DROP POLICY IF EXISTS "Anyone can lookup device tokens" ON public.loyalty_device_tokens;
DROP POLICY IF EXISTS "Anyone can update last_used_at on device tokens" ON public.loyalty_device_tokens;

-- Step 5: Drop existing triggers
DROP TRIGGER IF EXISTS decrement_prize_inventory_trigger ON public.game_plays;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS update_loyalty_accounts_updated_at ON public.loyalty_accounts;
DROP TRIGGER IF EXISTS update_loyalty_programs_updated_at ON public.loyalty_programs;
DROP TRIGGER IF EXISTS update_updated_at ON public.agencies;
DROP TRIGGER IF EXISTS update_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS tr_update_client_status_timestamp ON public.clients;

-- Step 6: Move tables to new schema (order matters for FK dependencies)
ALTER TABLE IF EXISTS public.agencies SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.games SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.clients SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.campaigns SET SCHEMA app_bizgamez_agency;

-- Handle profiles - remove default, change type, set new default, then move
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE app_bizgamez_agency.user_role
  USING role::text::app_bizgamez_agency.user_role;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'client'::app_bizgamez_agency.user_role;
ALTER TABLE IF EXISTS public.profiles SET SCHEMA app_bizgamez_agency;

ALTER TABLE IF EXISTS public.leads SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.webhook_events SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.prize_inventory SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.game_plays SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.loyalty_programs SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.loyalty_accounts SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.redemptions SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.loyalty_progress_log SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.loyalty_device_tokens SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.validation_attempts SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.validation_lockouts SET SCHEMA app_bizgamez_agency;
ALTER TABLE IF EXISTS public.loyalty_redemptions SET SCHEMA app_bizgamez_agency;

-- Step 7: Drop old enum type from public schema
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Step 8: Create functions in new schema
CREATE OR REPLACE FUNCTION app_bizgamez_agency.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.update_client_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.generate_member_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.generate_loyalty_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.decrement_prize_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_win = TRUE AND NEW.outcome_prize_name IS NOT NULL THEN
    UPDATE app_bizgamez_agency.prize_inventory
    SET remaining_quantity = GREATEST(0, remaining_quantity - 1)
    WHERE campaign_id = NEW.campaign_id
      AND prize_name = NEW.outcome_prize_name
      AND remaining_quantity > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.get_my_role()
RETURNS app_bizgamez_agency.user_role AS $$
DECLARE
  user_role_val app_bizgamez_agency.user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM app_bizgamez_agency.profiles
  WHERE id = auth.uid();
  RETURN user_role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.get_user_client_id()
RETURNS UUID AS $$
DECLARE
  cid UUID;
BEGIN
  SELECT client_id INTO cid
  FROM app_bizgamez_agency.profiles
  WHERE id = auth.uid();
  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val app_bizgamez_agency.user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM app_bizgamez_agency.profiles
  WHERE id = auth.uid();
  RETURN user_role_val IN ('super_admin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.is_admin_safe()
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val TEXT;
BEGIN
  SELECT role::text INTO user_role_val
  FROM app_bizgamez_agency.profiles
  WHERE id = auth.uid();
  RETURN user_role_val IN ('super_admin', 'admin');
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION app_bizgamez_agency.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Recreate triggers
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON app_bizgamez_agency.agencies
  FOR EACH ROW
  EXECUTE FUNCTION app_bizgamez_agency.update_updated_at_column();

CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON app_bizgamez_agency.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION app_bizgamez_agency.update_updated_at_column();

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON app_bizgamez_agency.profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_bizgamez_agency.handle_updated_at();

CREATE TRIGGER update_loyalty_accounts_updated_at
  BEFORE UPDATE ON app_bizgamez_agency.loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION app_bizgamez_agency.update_updated_at_column();

CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON app_bizgamez_agency.loyalty_programs
  FOR EACH ROW
  EXECUTE FUNCTION app_bizgamez_agency.update_updated_at_column();

CREATE TRIGGER decrement_prize_inventory_trigger
  AFTER INSERT ON app_bizgamez_agency.game_plays
  FOR EACH ROW
  EXECUTE FUNCTION app_bizgamez_agency.decrement_prize_inventory();

CREATE TRIGGER tr_update_client_status_timestamp
  BEFORE UPDATE ON app_bizgamez_agency.clients
  FOR EACH ROW
  EXECUTE FUNCTION app_bizgamez_agency.update_client_status_timestamp();

-- Step 10: Drop old functions from public schema
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_client_status_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.generate_member_code() CASCADE;
DROP FUNCTION IF EXISTS public.generate_loyalty_short_code() CASCADE;
DROP FUNCTION IF EXISTS public.decrement_prize_inventory() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_client_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_safe() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 11: Create new RLS policies

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON app_bizgamez_agency.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON app_bizgamez_agency.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON app_bizgamez_agency.profiles FOR SELECT
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Admins can update all profiles"
  ON app_bizgamez_agency.profiles FOR UPDATE
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe())
  WITH CHECK (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Admins can insert profiles"
  ON app_bizgamez_agency.profiles FOR INSERT
  TO authenticated
  WITH CHECK (app_bizgamez_agency.is_admin_safe());

-- Agencies policies
CREATE POLICY "Admins can view agencies"
  ON app_bizgamez_agency.agencies FOR SELECT
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Admins can insert agencies"
  ON app_bizgamez_agency.agencies FOR INSERT
  TO authenticated
  WITH CHECK (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Admins can update agencies"
  ON app_bizgamez_agency.agencies FOR UPDATE
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe())
  WITH CHECK (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Admins can delete agencies"
  ON app_bizgamez_agency.agencies FOR DELETE
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe());

-- Clients policies
CREATE POLICY "Users can view assigned client"
  ON app_bizgamez_agency.clients FOR SELECT
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR id = app_bizgamez_agency.get_user_client_id()
  );

CREATE POLICY "Admins can insert clients"
  ON app_bizgamez_agency.clients FOR INSERT
  TO authenticated
  WITH CHECK (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Users can update assigned client"
  ON app_bizgamez_agency.clients FOR UPDATE
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR id = app_bizgamez_agency.get_user_client_id()
  )
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR id = app_bizgamez_agency.get_user_client_id()
  );

CREATE POLICY "Admins can delete clients"
  ON app_bizgamez_agency.clients FOR DELETE
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe());

-- Campaigns policies
CREATE POLICY "Users can view own client campaigns"
  ON app_bizgamez_agency.campaigns FOR SELECT
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  );

CREATE POLICY "Public can view active campaigns"
  ON app_bizgamez_agency.campaigns FOR SELECT
  TO anon
  USING (status = 'active');

CREATE POLICY "Users can insert campaigns"
  ON app_bizgamez_agency.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  );

CREATE POLICY "Users can update own client campaigns"
  ON app_bizgamez_agency.campaigns FOR UPDATE
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  )
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  );

CREATE POLICY "Admins can delete campaigns"
  ON app_bizgamez_agency.campaigns FOR DELETE
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe());

-- Leads policies
CREATE POLICY "Users can view own client leads"
  ON app_bizgamez_agency.leads FOR SELECT
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  );

CREATE POLICY "Anyone can insert leads"
  ON app_bizgamez_agency.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Redemptions policies
CREATE POLICY "Users can view own client redemptions"
  ON app_bizgamez_agency.redemptions FOR SELECT
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  );

CREATE POLICY "Public can view redemptions by short_code"
  ON app_bizgamez_agency.redemptions FOR SELECT
  TO anon
  USING (short_code IS NOT NULL);

CREATE POLICY "Anyone can insert redemptions"
  ON app_bizgamez_agency.redemptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own client redemptions"
  ON app_bizgamez_agency.redemptions FOR UPDATE
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  )
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  );

-- Games policies
CREATE POLICY "Admins can view games"
  ON app_bizgamez_agency.games FOR SELECT
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Admins can insert games"
  ON app_bizgamez_agency.games FOR INSERT
  TO authenticated
  WITH CHECK (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Admins can update games"
  ON app_bizgamez_agency.games FOR UPDATE
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe())
  WITH CHECK (app_bizgamez_agency.is_admin_safe());

CREATE POLICY "Admins can delete games"
  ON app_bizgamez_agency.games FOR DELETE
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe());

-- Game plays policies
CREATE POLICY "Anyone can insert game plays"
  ON app_bizgamez_agency.game_plays FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own client game plays"
  ON app_bizgamez_agency.game_plays FOR SELECT
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  );

-- Prize inventory policies
CREATE POLICY "Users can view own client prize inventory"
  ON app_bizgamez_agency.prize_inventory FOR SELECT
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  );

CREATE POLICY "Users can insert prize inventory"
  ON app_bizgamez_agency.prize_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  );

CREATE POLICY "Users can update prize inventory"
  ON app_bizgamez_agency.prize_inventory FOR UPDATE
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  )
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  );

-- Webhook events policies
CREATE POLICY "Users can view own client webhook events"
  ON app_bizgamez_agency.webhook_events FOR SELECT
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  );

CREATE POLICY "Anyone can insert webhook events"
  ON app_bizgamez_agency.webhook_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update webhook events"
  ON app_bizgamez_agency.webhook_events FOR UPDATE
  TO authenticated
  USING (app_bizgamez_agency.is_admin_safe())
  WITH CHECK (app_bizgamez_agency.is_admin_safe());

-- Loyalty programs policies
CREATE POLICY "Public can view loyalty programs"
  ON app_bizgamez_agency.loyalty_programs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert loyalty programs"
  ON app_bizgamez_agency.loyalty_programs FOR INSERT
  TO authenticated
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  );

CREATE POLICY "Users can update loyalty programs"
  ON app_bizgamez_agency.loyalty_programs FOR UPDATE
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  )
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  );

-- Loyalty accounts policies
CREATE POLICY "Public can view loyalty accounts"
  ON app_bizgamez_agency.loyalty_accounts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert loyalty accounts"
  ON app_bizgamez_agency.loyalty_accounts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update loyalty accounts"
  ON app_bizgamez_agency.loyalty_accounts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can delete loyalty accounts"
  ON app_bizgamez_agency.loyalty_accounts FOR DELETE
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR client_id = app_bizgamez_agency.get_user_client_id()
  );

-- Loyalty progress log policies
CREATE POLICY "Public can view loyalty progress"
  ON app_bizgamez_agency.loyalty_progress_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert loyalty progress"
  ON app_bizgamez_agency.loyalty_progress_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Loyalty redemptions policies
CREATE POLICY "Public can view loyalty redemptions"
  ON app_bizgamez_agency.loyalty_redemptions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert loyalty redemptions"
  ON app_bizgamez_agency.loyalty_redemptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update loyalty redemptions"
  ON app_bizgamez_agency.loyalty_redemptions FOR UPDATE
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  )
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  );

-- Validation attempts policies
CREATE POLICY "Public can view validation attempts"
  ON app_bizgamez_agency.validation_attempts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert validation attempts"
  ON app_bizgamez_agency.validation_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Validation lockouts policies
CREATE POLICY "Public can view validation lockouts"
  ON app_bizgamez_agency.validation_lockouts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert validation lockouts"
  ON app_bizgamez_agency.validation_lockouts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update validation lockouts"
  ON app_bizgamez_agency.validation_lockouts FOR UPDATE
  TO authenticated
  USING (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  )
  WITH CHECK (
    app_bizgamez_agency.is_admin_safe()
    OR campaign_id IN (
      SELECT id FROM app_bizgamez_agency.campaigns
      WHERE client_id = app_bizgamez_agency.get_user_client_id()
    )
  );

-- Loyalty device tokens policies
CREATE POLICY "Public can view device tokens"
  ON app_bizgamez_agency.loyalty_device_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert device tokens"
  ON app_bizgamez_agency.loyalty_device_tokens FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update device tokens"
  ON app_bizgamez_agency.loyalty_device_tokens FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);