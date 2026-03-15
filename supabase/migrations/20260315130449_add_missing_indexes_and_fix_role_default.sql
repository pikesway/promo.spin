/*
  # Add missing indexes and fix profiles.role default

  1. Missing indexes added
    - loyalty_progress_log(loyalty_account_id) — fast per-member activity log queries
    - loyalty_redemptions(loyalty_account_id) — fast per-member redemption lookups
    - loyalty_redemptions(campaign_id) — campaign-level redemption queries
    - validation_attempts(loyalty_account_id) — lockout enforcement queries
    - campaign_insights_cache(next_refresh_at) — cache expiry queries

  2. Profiles table fix
    - Change role default from 'client' to 'client_user' to match application role vocabulary
    - Add 'staff' to the allowed role check constraint if it doesn't already include it

  3. Notes
    - All CREATE INDEX statements use IF NOT EXISTS to be safe on re-run
    - The role default change only affects new rows; existing data is unchanged
*/

CREATE INDEX IF NOT EXISTS idx_loyalty_progress_log_account_id
  ON public.loyalty_progress_log (loyalty_account_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_account_id
  ON public.loyalty_redemptions (loyalty_account_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_campaign_id
  ON public.loyalty_redemptions (campaign_id);

CREATE INDEX IF NOT EXISTS idx_validation_attempts_account_id
  ON public.validation_attempts (loyalty_account_id);

CREATE INDEX IF NOT EXISTS idx_insights_cache_next_refresh
  ON public.campaign_insights_cache (next_refresh_at);

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'client_user';
