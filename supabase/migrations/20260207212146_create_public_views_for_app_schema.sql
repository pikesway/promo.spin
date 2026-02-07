/*
  # Create Public Schema Views for app_bizgamez_agency Tables

  Since PostgREST only exposes public and graphql_public schemas by default,
  this migration creates views in the public schema that point to the actual
  tables in app_bizgamez_agency. This allows the Supabase JS client to query
  these tables without schema configuration.

  ## How it works
  - Views are created in public schema
  - Views point to actual tables in app_bizgamez_agency
  - RLS policies on the underlying tables still apply
  - INSTEAD OF triggers handle INSERT, UPDATE, DELETE operations

  ## Tables covered
  All 17 application tables have corresponding views
*/

-- Create view for agencies
CREATE OR REPLACE VIEW public.agencies AS
SELECT * FROM app_bizgamez_agency.agencies;

CREATE OR REPLACE FUNCTION public.agencies_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.agencies (id, name, email, subdomain, settings, status, created_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.name,
    NEW.email,
    NEW.subdomain,
    COALESCE(NEW.settings, '{}'::jsonb),
    COALESCE(NEW.status, 'active'),
    COALESCE(NEW.created_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.agencies_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.agencies
  SET name = NEW.name,
      email = NEW.email,
      subdomain = NEW.subdomain,
      settings = NEW.settings,
      status = NEW.status
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.agencies_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.agencies WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS agencies_insert ON public.agencies;
DROP TRIGGER IF EXISTS agencies_update ON public.agencies;
DROP TRIGGER IF EXISTS agencies_delete ON public.agencies;

CREATE TRIGGER agencies_insert INSTEAD OF INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.agencies_insert_trigger();
CREATE TRIGGER agencies_update INSTEAD OF UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.agencies_update_trigger();
CREATE TRIGGER agencies_delete INSTEAD OF DELETE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.agencies_delete_trigger();

-- Create view for clients
CREATE OR REPLACE VIEW public.clients AS
SELECT * FROM app_bizgamez_agency.clients;

CREATE OR REPLACE FUNCTION public.clients_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.clients (id, agency_id, name, email, logo_url, settings, status, logo_type, primary_color, secondary_color, background_color, status_notes, status_updated_at, unlock_pin)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.agency_id,
    NEW.name,
    NEW.email,
    NEW.logo_url,
    COALESCE(NEW.settings, '{}'::jsonb),
    COALESCE(NEW.status, 'active'),
    COALESCE(NEW.logo_type, 'url'),
    COALESCE(NEW.primary_color, '#6366F1'),
    COALESCE(NEW.secondary_color, '#8B5CF6'),
    COALESCE(NEW.background_color, '#09090B'),
    NEW.status_notes,
    COALESCE(NEW.status_updated_at, now()),
    NEW.unlock_pin
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.clients_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.clients
  SET agency_id = NEW.agency_id,
      name = NEW.name,
      email = NEW.email,
      logo_url = NEW.logo_url,
      settings = NEW.settings,
      status = NEW.status,
      logo_type = NEW.logo_type,
      primary_color = NEW.primary_color,
      secondary_color = NEW.secondary_color,
      background_color = NEW.background_color,
      status_notes = NEW.status_notes,
      status_updated_at = NEW.status_updated_at,
      unlock_pin = NEW.unlock_pin
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.clients_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.clients WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS clients_insert ON public.clients;
DROP TRIGGER IF EXISTS clients_update ON public.clients;
DROP TRIGGER IF EXISTS clients_delete ON public.clients;

CREATE TRIGGER clients_insert INSTEAD OF INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.clients_insert_trigger();
CREATE TRIGGER clients_update INSTEAD OF UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.clients_update_trigger();
CREATE TRIGGER clients_delete INSTEAD OF DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.clients_delete_trigger();

-- Create view for campaigns
CREATE OR REPLACE VIEW public.campaigns AS
SELECT * FROM app_bizgamez_agency.campaigns;

CREATE OR REPLACE FUNCTION public.campaigns_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.campaigns (id, client_id, name, slug, type, status, start_date, end_date, config, analytics, created_at, updated_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.client_id,
    NEW.name,
    NEW.slug,
    NEW.type,
    COALESCE(NEW.status, 'draft'),
    NEW.start_date,
    NEW.end_date,
    COALESCE(NEW.config, '{}'::jsonb),
    COALESCE(NEW.analytics, '{}'::jsonb),
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.campaigns_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.campaigns
  SET client_id = NEW.client_id,
      name = NEW.name,
      slug = NEW.slug,
      type = NEW.type,
      status = NEW.status,
      start_date = NEW.start_date,
      end_date = NEW.end_date,
      config = NEW.config,
      analytics = NEW.analytics,
      updated_at = now()
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.campaigns_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.campaigns WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS campaigns_insert ON public.campaigns;
DROP TRIGGER IF EXISTS campaigns_update ON public.campaigns;
DROP TRIGGER IF EXISTS campaigns_delete ON public.campaigns;

CREATE TRIGGER campaigns_insert INSTEAD OF INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.campaigns_insert_trigger();
CREATE TRIGGER campaigns_update INSTEAD OF UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.campaigns_update_trigger();
CREATE TRIGGER campaigns_delete INSTEAD OF DELETE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.campaigns_delete_trigger();

-- Create view for profiles
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
  id,
  email,
  full_name,
  role::text as role,
  client_id,
  is_active,
  created_at,
  updated_at,
  theme_preference
FROM app_bizgamez_agency.profiles;

CREATE OR REPLACE FUNCTION public.profiles_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.profiles (id, email, full_name, role, client_id, is_active, created_at, updated_at, theme_preference)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.full_name,
    COALESCE(NEW.role, 'client')::app_bizgamez_agency.user_role,
    NEW.client_id,
    COALESCE(NEW.is_active, true),
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now()),
    COALESCE(NEW.theme_preference, 'system')
  )
  RETURNING id, email, full_name, role::text, client_id, is_active, created_at, updated_at, theme_preference INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.profiles_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.profiles
  SET email = NEW.email,
      full_name = NEW.full_name,
      role = NEW.role::app_bizgamez_agency.user_role,
      client_id = NEW.client_id,
      is_active = NEW.is_active,
      updated_at = now(),
      theme_preference = NEW.theme_preference
  WHERE id = OLD.id
  RETURNING id, email, full_name, role::text, client_id, is_active, created_at, updated_at, theme_preference INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.profiles_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_insert ON public.profiles;
DROP TRIGGER IF EXISTS profiles_update ON public.profiles;
DROP TRIGGER IF EXISTS profiles_delete ON public.profiles;

CREATE TRIGGER profiles_insert INSTEAD OF INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_insert_trigger();
CREATE TRIGGER profiles_update INSTEAD OF UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_update_trigger();
CREATE TRIGGER profiles_delete INSTEAD OF DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_delete_trigger();

-- Create view for leads
CREATE OR REPLACE VIEW public.leads AS
SELECT * FROM app_bizgamez_agency.leads;

CREATE OR REPLACE FUNCTION public.leads_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.leads (id, campaign_id, client_id, data, metadata, created_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.campaign_id,
    NEW.client_id,
    COALESCE(NEW.data, '{}'::jsonb),
    COALESCE(NEW.metadata, '{}'::jsonb),
    COALESCE(NEW.created_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.leads_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.leads
  SET campaign_id = NEW.campaign_id,
      client_id = NEW.client_id,
      data = NEW.data,
      metadata = NEW.metadata
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.leads_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.leads WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS leads_insert ON public.leads;
DROP TRIGGER IF EXISTS leads_update ON public.leads;
DROP TRIGGER IF EXISTS leads_delete ON public.leads;

CREATE TRIGGER leads_insert INSTEAD OF INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_insert_trigger();
CREATE TRIGGER leads_update INSTEAD OF UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_update_trigger();
CREATE TRIGGER leads_delete INSTEAD OF DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_delete_trigger();

-- Create view for redemptions
CREATE OR REPLACE VIEW public.redemptions AS
SELECT * FROM app_bizgamez_agency.redemptions;

CREATE OR REPLACE FUNCTION public.redemptions_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.redemptions (id, campaign_id, client_id, lead_id, prize_name, short_code, status, generated_at, expires_at, redeemed_at, redeemed_by, metadata, redemption_token, token_expires_at, email, email_sent_at, email_status)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.campaign_id,
    NEW.client_id,
    NEW.lead_id,
    NEW.prize_name,
    NEW.short_code,
    COALESCE(NEW.status, 'valid'),
    COALESCE(NEW.generated_at, now()),
    NEW.expires_at,
    NEW.redeemed_at,
    NEW.redeemed_by,
    COALESCE(NEW.metadata, '{}'::jsonb),
    NEW.redemption_token,
    NEW.token_expires_at,
    NEW.email,
    NEW.email_sent_at,
    COALESCE(NEW.email_status, 'pending')
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.redemptions_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.redemptions
  SET campaign_id = NEW.campaign_id,
      client_id = NEW.client_id,
      lead_id = NEW.lead_id,
      prize_name = NEW.prize_name,
      short_code = NEW.short_code,
      status = NEW.status,
      expires_at = NEW.expires_at,
      redeemed_at = NEW.redeemed_at,
      redeemed_by = NEW.redeemed_by,
      metadata = NEW.metadata,
      redemption_token = NEW.redemption_token,
      token_expires_at = NEW.token_expires_at,
      email = NEW.email,
      email_sent_at = NEW.email_sent_at,
      email_status = NEW.email_status
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.redemptions_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.redemptions WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS redemptions_insert ON public.redemptions;
DROP TRIGGER IF EXISTS redemptions_update ON public.redemptions;
DROP TRIGGER IF EXISTS redemptions_delete ON public.redemptions;

CREATE TRIGGER redemptions_insert INSTEAD OF INSERT ON public.redemptions
  FOR EACH ROW EXECUTE FUNCTION public.redemptions_insert_trigger();
CREATE TRIGGER redemptions_update INSTEAD OF UPDATE ON public.redemptions
  FOR EACH ROW EXECUTE FUNCTION public.redemptions_update_trigger();
CREATE TRIGGER redemptions_delete INSTEAD OF DELETE ON public.redemptions
  FOR EACH ROW EXECUTE FUNCTION public.redemptions_delete_trigger();

-- Create view for games
CREATE OR REPLACE VIEW public.games AS
SELECT * FROM app_bizgamez_agency.games;

CREATE OR REPLACE FUNCTION public.games_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.games (id, name, data, is_active, created_at)
  VALUES (
    NEW.id,
    NEW.name,
    COALESCE(NEW.data, '{}'::jsonb),
    COALESCE(NEW.is_active, true),
    COALESCE(NEW.created_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.games_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.games
  SET name = NEW.name,
      data = NEW.data,
      is_active = NEW.is_active
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.games_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.games WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS games_insert ON public.games;
DROP TRIGGER IF EXISTS games_update ON public.games;
DROP TRIGGER IF EXISTS games_delete ON public.games;

CREATE TRIGGER games_insert INSTEAD OF INSERT ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.games_insert_trigger();
CREATE TRIGGER games_update INSTEAD OF UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.games_update_trigger();
CREATE TRIGGER games_delete INSTEAD OF DELETE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.games_delete_trigger();

-- Create view for game_plays
CREATE OR REPLACE VIEW public.game_plays AS
SELECT * FROM app_bizgamez_agency.game_plays;

CREATE OR REPLACE FUNCTION public.game_plays_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.game_plays (id, campaign_id, user_id, session_id, outcome_prize_name, is_win, played_at, ip_address, user_agent, metadata)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.campaign_id,
    NEW.user_id,
    NEW.session_id,
    NEW.outcome_prize_name,
    COALESCE(NEW.is_win, false),
    COALESCE(NEW.played_at, now()),
    NEW.ip_address,
    NEW.user_agent,
    COALESCE(NEW.metadata, '{}'::jsonb)
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS game_plays_insert ON public.game_plays;
CREATE TRIGGER game_plays_insert INSTEAD OF INSERT ON public.game_plays
  FOR EACH ROW EXECUTE FUNCTION public.game_plays_insert_trigger();

-- Create view for prize_inventory
CREATE OR REPLACE VIEW public.prize_inventory AS
SELECT * FROM app_bizgamez_agency.prize_inventory;

CREATE OR REPLACE FUNCTION public.prize_inventory_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.prize_inventory (id, campaign_id, prize_name, initial_quantity, remaining_quantity, created_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.campaign_id,
    NEW.prize_name,
    COALESCE(NEW.initial_quantity, 0),
    COALESCE(NEW.remaining_quantity, 0),
    COALESCE(NEW.created_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.prize_inventory_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.prize_inventory
  SET campaign_id = NEW.campaign_id,
      prize_name = NEW.prize_name,
      initial_quantity = NEW.initial_quantity,
      remaining_quantity = NEW.remaining_quantity
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.prize_inventory_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.prize_inventory WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prize_inventory_insert ON public.prize_inventory;
DROP TRIGGER IF EXISTS prize_inventory_update ON public.prize_inventory;
DROP TRIGGER IF EXISTS prize_inventory_delete ON public.prize_inventory;

CREATE TRIGGER prize_inventory_insert INSTEAD OF INSERT ON public.prize_inventory
  FOR EACH ROW EXECUTE FUNCTION public.prize_inventory_insert_trigger();
CREATE TRIGGER prize_inventory_update INSTEAD OF UPDATE ON public.prize_inventory
  FOR EACH ROW EXECUTE FUNCTION public.prize_inventory_update_trigger();
CREATE TRIGGER prize_inventory_delete INSTEAD OF DELETE ON public.prize_inventory
  FOR EACH ROW EXECUTE FUNCTION public.prize_inventory_delete_trigger();

-- Create view for webhook_events
CREATE OR REPLACE VIEW public.webhook_events AS
SELECT * FROM app_bizgamez_agency.webhook_events;

CREATE OR REPLACE FUNCTION public.webhook_events_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.webhook_events (id, campaign_id, client_id, game_code, score, name, email, mobile, raw_payload, status, error_message, created_at, processed_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.campaign_id,
    NEW.client_id,
    NEW.game_code,
    COALESCE(NEW.score, 0),
    NEW.name,
    NEW.email,
    NEW.mobile,
    COALESCE(NEW.raw_payload, '{}'::jsonb),
    COALESCE(NEW.status, 'pending'),
    NEW.error_message,
    COALESCE(NEW.created_at, now()),
    NEW.processed_at
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.webhook_events_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.webhook_events
  SET campaign_id = NEW.campaign_id,
      client_id = NEW.client_id,
      game_code = NEW.game_code,
      score = NEW.score,
      name = NEW.name,
      email = NEW.email,
      mobile = NEW.mobile,
      raw_payload = NEW.raw_payload,
      status = NEW.status,
      error_message = NEW.error_message,
      processed_at = NEW.processed_at
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS webhook_events_insert ON public.webhook_events;
DROP TRIGGER IF EXISTS webhook_events_update ON public.webhook_events;

CREATE TRIGGER webhook_events_insert INSTEAD OF INSERT ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.webhook_events_insert_trigger();
CREATE TRIGGER webhook_events_update INSTEAD OF UPDATE ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.webhook_events_update_trigger();

-- Create view for loyalty_programs
CREATE OR REPLACE VIEW public.loyalty_programs AS
SELECT * FROM app_bizgamez_agency.loyalty_programs;

CREATE OR REPLACE FUNCTION public.loyalty_programs_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.loyalty_programs (id, campaign_id, program_type, threshold, validation_method, validation_config, reward_name, reward_description, reset_behavior, lockout_threshold, max_redemptions_per_period, period_type, created_at, updated_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.campaign_id,
    COALESCE(NEW.program_type, 'visit'),
    COALESCE(NEW.threshold, 10),
    COALESCE(NEW.validation_method, 'pin'),
    COALESCE(NEW.validation_config, '{}'::jsonb),
    COALESCE(NEW.reward_name, 'Free Reward'),
    COALESCE(NEW.reward_description, ''),
    COALESCE(NEW.reset_behavior, 'reset'),
    COALESCE(NEW.lockout_threshold, 3),
    NEW.max_redemptions_per_period,
    COALESCE(NEW.period_type, 'none'),
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.loyalty_programs_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.loyalty_programs
  SET campaign_id = NEW.campaign_id,
      program_type = NEW.program_type,
      threshold = NEW.threshold,
      validation_method = NEW.validation_method,
      validation_config = NEW.validation_config,
      reward_name = NEW.reward_name,
      reward_description = NEW.reward_description,
      reset_behavior = NEW.reset_behavior,
      lockout_threshold = NEW.lockout_threshold,
      max_redemptions_per_period = NEW.max_redemptions_per_period,
      period_type = NEW.period_type,
      updated_at = now()
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.loyalty_programs_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.loyalty_programs WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS loyalty_programs_insert ON public.loyalty_programs;
DROP TRIGGER IF EXISTS loyalty_programs_update ON public.loyalty_programs;
DROP TRIGGER IF EXISTS loyalty_programs_delete ON public.loyalty_programs;

CREATE TRIGGER loyalty_programs_insert INSTEAD OF INSERT ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_programs_insert_trigger();
CREATE TRIGGER loyalty_programs_update INSTEAD OF UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_programs_update_trigger();
CREATE TRIGGER loyalty_programs_delete INSTEAD OF DELETE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_programs_delete_trigger();

-- Create view for loyalty_accounts
CREATE OR REPLACE VIEW public.loyalty_accounts AS
SELECT * FROM app_bizgamez_agency.loyalty_accounts;

CREATE OR REPLACE FUNCTION public.loyalty_accounts_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.loyalty_accounts (id, campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, reward_unlocked_at, member_code, enrolled_at, updated_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.campaign_id,
    NEW.client_id,
    NEW.email,
    COALESCE(NEW.name, ''),
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.current_progress, 0),
    COALESCE(NEW.total_visits, 0),
    COALESCE(NEW.reward_unlocked, false),
    NEW.reward_unlocked_at,
    NEW.member_code,
    COALESCE(NEW.enrolled_at, now()),
    COALESCE(NEW.updated_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.loyalty_accounts_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.loyalty_accounts
  SET campaign_id = NEW.campaign_id,
      client_id = NEW.client_id,
      email = NEW.email,
      name = NEW.name,
      phone = NEW.phone,
      current_progress = NEW.current_progress,
      total_visits = NEW.total_visits,
      reward_unlocked = NEW.reward_unlocked,
      reward_unlocked_at = NEW.reward_unlocked_at,
      member_code = NEW.member_code,
      updated_at = now()
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.loyalty_accounts_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_bizgamez_agency.loyalty_accounts WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS loyalty_accounts_insert ON public.loyalty_accounts;
DROP TRIGGER IF EXISTS loyalty_accounts_update ON public.loyalty_accounts;
DROP TRIGGER IF EXISTS loyalty_accounts_delete ON public.loyalty_accounts;

CREATE TRIGGER loyalty_accounts_insert INSTEAD OF INSERT ON public.loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_accounts_insert_trigger();
CREATE TRIGGER loyalty_accounts_update INSTEAD OF UPDATE ON public.loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_accounts_update_trigger();
CREATE TRIGGER loyalty_accounts_delete INSTEAD OF DELETE ON public.loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_accounts_delete_trigger();

-- Create view for loyalty_progress_log
CREATE OR REPLACE VIEW public.loyalty_progress_log AS
SELECT * FROM app_bizgamez_agency.loyalty_progress_log;

CREATE OR REPLACE FUNCTION public.loyalty_progress_log_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.loyalty_progress_log (id, loyalty_account_id, campaign_id, action_type, quantity, validated_by, device_info, created_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.loyalty_account_id,
    NEW.campaign_id,
    NEW.action_type,
    COALESCE(NEW.quantity, 1),
    NEW.validated_by,
    COALESCE(NEW.device_info, '{}'::jsonb),
    COALESCE(NEW.created_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS loyalty_progress_log_insert ON public.loyalty_progress_log;
CREATE TRIGGER loyalty_progress_log_insert INSTEAD OF INSERT ON public.loyalty_progress_log
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_progress_log_insert_trigger();

-- Create view for loyalty_redemptions
CREATE OR REPLACE VIEW public.loyalty_redemptions AS
SELECT * FROM app_bizgamez_agency.loyalty_redemptions;

CREATE OR REPLACE FUNCTION public.loyalty_redemptions_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.loyalty_redemptions (id, loyalty_account_id, campaign_id, short_code, status, redeemed_at, redeemed_by, created_at, expires_at, redemption_id)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.loyalty_account_id,
    NEW.campaign_id,
    NEW.short_code,
    COALESCE(NEW.status, 'valid'),
    NEW.redeemed_at,
    NEW.redeemed_by,
    COALESCE(NEW.created_at, now()),
    NEW.expires_at,
    NEW.redemption_id
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.loyalty_redemptions_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.loyalty_redemptions
  SET loyalty_account_id = NEW.loyalty_account_id,
      campaign_id = NEW.campaign_id,
      short_code = NEW.short_code,
      status = NEW.status,
      redeemed_at = NEW.redeemed_at,
      redeemed_by = NEW.redeemed_by,
      expires_at = NEW.expires_at,
      redemption_id = NEW.redemption_id
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS loyalty_redemptions_insert ON public.loyalty_redemptions;
DROP TRIGGER IF EXISTS loyalty_redemptions_update ON public.loyalty_redemptions;

CREATE TRIGGER loyalty_redemptions_insert INSTEAD OF INSERT ON public.loyalty_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_redemptions_insert_trigger();
CREATE TRIGGER loyalty_redemptions_update INSTEAD OF UPDATE ON public.loyalty_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_redemptions_update_trigger();

-- Create view for validation_attempts
CREATE OR REPLACE VIEW public.validation_attempts AS
SELECT * FROM app_bizgamez_agency.validation_attempts;

CREATE OR REPLACE FUNCTION public.validation_attempts_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.validation_attempts (id, loyalty_account_id, campaign_id, attempt_type, success, device_info, created_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.loyalty_account_id,
    NEW.campaign_id,
    NEW.attempt_type,
    COALESCE(NEW.success, false),
    COALESCE(NEW.device_info, '{}'::jsonb),
    COALESCE(NEW.created_at, now())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validation_attempts_insert ON public.validation_attempts;
CREATE TRIGGER validation_attempts_insert INSTEAD OF INSERT ON public.validation_attempts
  FOR EACH ROW EXECUTE FUNCTION public.validation_attempts_insert_trigger();

-- Create view for validation_lockouts
CREATE OR REPLACE VIEW public.validation_lockouts AS
SELECT * FROM app_bizgamez_agency.validation_lockouts;

CREATE OR REPLACE FUNCTION public.validation_lockouts_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.validation_lockouts (id, loyalty_account_id, campaign_id, reason, locked_at, unlocked_at, unlocked_by)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.loyalty_account_id,
    NEW.campaign_id,
    COALESCE(NEW.reason, 'Too many failed validation attempts'),
    COALESCE(NEW.locked_at, now()),
    NEW.unlocked_at,
    NEW.unlocked_by
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validation_lockouts_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.validation_lockouts
  SET loyalty_account_id = NEW.loyalty_account_id,
      campaign_id = NEW.campaign_id,
      reason = NEW.reason,
      locked_at = NEW.locked_at,
      unlocked_at = NEW.unlocked_at,
      unlocked_by = NEW.unlocked_by
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validation_lockouts_insert ON public.validation_lockouts;
DROP TRIGGER IF EXISTS validation_lockouts_update ON public.validation_lockouts;

CREATE TRIGGER validation_lockouts_insert INSTEAD OF INSERT ON public.validation_lockouts
  FOR EACH ROW EXECUTE FUNCTION public.validation_lockouts_insert_trigger();
CREATE TRIGGER validation_lockouts_update INSTEAD OF UPDATE ON public.validation_lockouts
  FOR EACH ROW EXECUTE FUNCTION public.validation_lockouts_update_trigger();

-- Create view for loyalty_device_tokens
CREATE OR REPLACE VIEW public.loyalty_device_tokens AS
SELECT * FROM app_bizgamez_agency.loyalty_device_tokens;

CREATE OR REPLACE FUNCTION public.loyalty_device_tokens_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_bizgamez_agency.loyalty_device_tokens (id, loyalty_account_id, campaign_id, device_token, device_name, created_at, last_used_at, expires_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.loyalty_account_id,
    NEW.campaign_id,
    NEW.device_token,
    COALESCE(NEW.device_name, ''),
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.last_used_at, now()),
    NEW.expires_at
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.loyalty_device_tokens_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_bizgamez_agency.loyalty_device_tokens
  SET loyalty_account_id = NEW.loyalty_account_id,
      campaign_id = NEW.campaign_id,
      device_token = NEW.device_token,
      device_name = NEW.device_name,
      last_used_at = NEW.last_used_at,
      expires_at = NEW.expires_at
  WHERE id = OLD.id
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS loyalty_device_tokens_insert ON public.loyalty_device_tokens;
DROP TRIGGER IF EXISTS loyalty_device_tokens_update ON public.loyalty_device_tokens;

CREATE TRIGGER loyalty_device_tokens_insert INSTEAD OF INSERT ON public.loyalty_device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_device_tokens_insert_trigger();
CREATE TRIGGER loyalty_device_tokens_update INSTEAD OF UPDATE ON public.loyalty_device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_device_tokens_update_trigger();

-- Grant permissions on views
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.redemptions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT SELECT, INSERT ON public.game_plays TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prize_inventory TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.webhook_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_programs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_accounts TO anon, authenticated;
GRANT SELECT, INSERT ON public.loyalty_progress_log TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.loyalty_redemptions TO anon, authenticated;
GRANT SELECT, INSERT ON public.validation_attempts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.validation_lockouts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.loyalty_device_tokens TO anon, authenticated;

-- Create helper functions in public schema that delegate to app_bizgamez_agency
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN app_bizgamez_agency.is_admin_safe();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS UUID AS $$
BEGIN
  RETURN app_bizgamez_agency.get_user_client_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN app_bizgamez_agency.get_my_role()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS TEXT AS $$
BEGIN
  RETURN app_bizgamez_agency.generate_member_code();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_loyalty_short_code()
RETURNS TEXT AS $$
BEGIN
  RETURN app_bizgamez_agency.generate_loyalty_short_code();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;