/*
  # Drop Unused Indexes

  ## Summary
  Removes indexes that have never been used according to Postgres statistics.
  Unused indexes waste disk space, slow down write operations (INSERT/UPDATE/DELETE),
  and add overhead to the query planner without providing any read performance benefit.

  ## Indexes Dropped
  - idx_campaign_rewards_campaign_id (campaign_rewards)
  - games_client_id_idx (games)
  - idx_campaign_bonus_rules_campaign_id (campaign_bonus_rules)
  - idx_game_plays_campaign_id (game_plays)
  - idx_loyalty_device_tokens_campaign_id (loyalty_device_tokens)
  - idx_loyalty_redemptions_redeemed_by (loyalty_redemptions)
  - idx_loyalty_redemptions_redemption_id (loyalty_redemptions)
  - idx_validation_attempts_campaign_id (validation_attempts)
  - idx_validation_lockouts_campaign_id (validation_lockouts)
  - idx_validation_lockouts_unlocked_by (validation_lockouts)
  - idx_loyalty_accounts_birthday (loyalty_accounts)
  - idx_loyalty_redemptions_source (loyalty_redemptions)
  - idx_loyalty_redemptions_tier (loyalty_redemptions)
  - idx_brands_active (brands)
  - idx_loyalty_accounts_brand_id (loyalty_accounts)
  - idx_leads_brand_id (leads)
  - idx_audit_logs_actor (audit_logs)
  - idx_audit_logs_created_at (audit_logs)
  - idx_client_notifications_read_at (client_notifications)
  - idx_loyalty_progress_log_account_id (loyalty_progress_log)
  - idx_loyalty_redemptions_account_id (loyalty_redemptions)
  - idx_loyalty_redemptions_campaign_id (loyalty_redemptions)
  - idx_validation_attempts_account_id (validation_attempts)
  - idx_insights_cache_next_refresh (campaign_insights_cache)

  ## Note
  These indexes are safe to drop now. They can be recreated if query patterns
  change in the future and profiling shows they would be beneficial.
*/

DROP INDEX IF EXISTS public.idx_campaign_rewards_campaign_id;
DROP INDEX IF EXISTS public.games_client_id_idx;
DROP INDEX IF EXISTS public.idx_campaign_bonus_rules_campaign_id;
DROP INDEX IF EXISTS public.idx_game_plays_campaign_id;
DROP INDEX IF EXISTS public.idx_loyalty_device_tokens_campaign_id;
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_redeemed_by;
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_redemption_id;
DROP INDEX IF EXISTS public.idx_validation_attempts_campaign_id;
DROP INDEX IF EXISTS public.idx_validation_lockouts_campaign_id;
DROP INDEX IF EXISTS public.idx_validation_lockouts_unlocked_by;
DROP INDEX IF EXISTS public.idx_loyalty_accounts_birthday;
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_source;
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_tier;
DROP INDEX IF EXISTS public.idx_brands_active;
DROP INDEX IF EXISTS public.idx_loyalty_accounts_brand_id;
DROP INDEX IF EXISTS public.idx_leads_brand_id;
DROP INDEX IF EXISTS public.idx_audit_logs_actor;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_client_notifications_read_at;
DROP INDEX IF EXISTS public.idx_loyalty_progress_log_account_id;
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_account_id;
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_campaign_id;
DROP INDEX IF EXISTS public.idx_validation_attempts_account_id;
DROP INDEX IF EXISTS public.idx_insights_cache_next_refresh;
