/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Drop unused indexes on app_bizgamez_agency tables to reduce storage overhead
    - These indexes were created but never used based on database statistics

  2. Policy Consolidation
    - Merge multiple permissive SELECT policies on profiles into single policy
    - Merge multiple permissive UPDATE policies on profiles into single policy
    - This improves query planning and reduces policy evaluation overhead

  3. Tables Affected
    - loyalty_accounts: drop 2 unused indexes
    - clients: drop 1 unused index
    - redemptions: drop 4 unused indexes
    - leads: drop 1 unused index
    - validation_attempts: drop 3 unused indexes
    - loyalty_device_tokens: drop 2 unused indexes
    - webhook_events: drop 4 unused indexes
    - profiles: drop 2 unused indexes, consolidate policies
    - loyalty_progress_log: drop 3 unused indexes
    - campaigns: drop 1 unused index
    - validation_lockouts: drop 3 unused indexes
    - loyalty_redemptions: drop 5 unused indexes
*/

-- Drop unused indexes from app_bizgamez_agency schema
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_accounts_client_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_accounts_email;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_clients_agency_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_redemptions_client_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_redemptions_lead_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_redemptions_token;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_redemptions_email;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_leads_client_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_validation_attempts_account_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_validation_attempts_created_at;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_validation_attempts_campaign_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_device_tokens_account_campaign;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_device_tokens_campaign_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_webhook_events_campaign_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_webhook_events_game_code;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_webhook_events_client_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_webhook_events_created_at;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_profiles_client_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_profiles_role;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_progress_log_account_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_progress_log_created_at;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_progress_log_validated_by;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_campaigns_client_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_validation_lockouts_account_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_validation_lockouts_campaign_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_validation_lockouts_unlocked_by;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_redemptions_account_id;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_redemptions_short_code;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_redemptions_status;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_redemptions_redeemed_by;
DROP INDEX IF EXISTS app_bizgamez_agency.idx_loyalty_redemptions_redemption_id;

-- Fix multiple permissive policies on profiles table
-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON app_bizgamez_agency.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON app_bizgamez_agency.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON app_bizgamez_agency.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON app_bizgamez_agency.profiles;

-- Create consolidated SELECT policy
CREATE POLICY "Users can view own or admin can view all profiles"
  ON app_bizgamez_agency.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM app_bizgamez_agency.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );

-- Create consolidated UPDATE policy
CREATE POLICY "Users can update own or admin can update all profiles"
  ON app_bizgamez_agency.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM app_bizgamez_agency.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM app_bizgamez_agency.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );