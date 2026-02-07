/*
  # Remove Public Schema Views

  Now that app_bizgamez_agency schema is exposed in the API settings,
  we can remove the public schema views that were created as a workaround.

  ## Changes
  - Drop all views in public schema that were pointing to app_bizgamez_agency tables
  - Drop all INSTEAD OF trigger functions
  - Drop public helper functions (keep app_bizgamez_agency versions)
*/

-- Drop views (this also drops their triggers)
DROP VIEW IF EXISTS public.agencies CASCADE;
DROP VIEW IF EXISTS public.clients CASCADE;
DROP VIEW IF EXISTS public.campaigns CASCADE;
DROP VIEW IF EXISTS public.profiles CASCADE;
DROP VIEW IF EXISTS public.leads CASCADE;
DROP VIEW IF EXISTS public.redemptions CASCADE;
DROP VIEW IF EXISTS public.games CASCADE;
DROP VIEW IF EXISTS public.game_plays CASCADE;
DROP VIEW IF EXISTS public.prize_inventory CASCADE;
DROP VIEW IF EXISTS public.webhook_events CASCADE;
DROP VIEW IF EXISTS public.loyalty_programs CASCADE;
DROP VIEW IF EXISTS public.loyalty_accounts CASCADE;
DROP VIEW IF EXISTS public.loyalty_progress_log CASCADE;
DROP VIEW IF EXISTS public.loyalty_redemptions CASCADE;
DROP VIEW IF EXISTS public.validation_attempts CASCADE;
DROP VIEW IF EXISTS public.validation_lockouts CASCADE;
DROP VIEW IF EXISTS public.loyalty_device_tokens CASCADE;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.agencies_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.agencies_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.agencies_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.clients_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.clients_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.clients_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.campaigns_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.campaigns_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.campaigns_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.profiles_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.profiles_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.profiles_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.leads_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.leads_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.leads_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.redemptions_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.redemptions_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.redemptions_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.games_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.games_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.games_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.game_plays_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.prize_inventory_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.prize_inventory_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.prize_inventory_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.webhook_events_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.webhook_events_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_programs_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_programs_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_programs_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_accounts_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_accounts_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_accounts_delete_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_progress_log_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_redemptions_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_redemptions_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.validation_attempts_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.validation_lockouts_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.validation_lockouts_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_device_tokens_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.loyalty_device_tokens_update_trigger() CASCADE;

-- Drop public helper functions (keep app_bizgamez_agency versions)
DROP FUNCTION IF EXISTS public.is_admin_safe() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_client_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.generate_member_code() CASCADE;
DROP FUNCTION IF EXISTS public.generate_loyalty_short_code() CASCADE;