/*
  # Add Missing Foreign Key Indexes

  ## Summary
  Adds covering indexes for all foreign key columns that were missing indexes.
  This prevents full table scans when joining on these columns, which is critical
  for query performance especially as data grows.

  ## Tables and Indexes Added
  1. audit_logs.impersonated_brand_id
  2. clients.agency_id
  3. leads.campaign_id
  4. leads.client_id
  5. loyalty_accounts.client_id
  6. loyalty_device_tokens.loyalty_account_id
  7. loyalty_progress_log.bonus_rule_id
  8. loyalty_progress_log.campaign_id
  9. profiles.client_id
  10. redemptions.campaign_id
  11. redemptions.client_id
  12. redemptions.lead_id
  13. validation_lockouts.loyalty_account_id
  14. webhook_events.campaign_id
  15. webhook_events.client_id
*/

CREATE INDEX IF NOT EXISTS idx_audit_logs_impersonated_brand_id
  ON public.audit_logs (impersonated_brand_id);

CREATE INDEX IF NOT EXISTS idx_clients_agency_id
  ON public.clients (agency_id);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id
  ON public.leads (campaign_id);

CREATE INDEX IF NOT EXISTS idx_leads_client_id
  ON public.leads (client_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_client_id
  ON public.loyalty_accounts (client_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_device_tokens_loyalty_account_id
  ON public.loyalty_device_tokens (loyalty_account_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_progress_log_bonus_rule_id
  ON public.loyalty_progress_log (bonus_rule_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_progress_log_campaign_id
  ON public.loyalty_progress_log (campaign_id);

CREATE INDEX IF NOT EXISTS idx_profiles_client_id
  ON public.profiles (client_id);

CREATE INDEX IF NOT EXISTS idx_redemptions_campaign_id
  ON public.redemptions (campaign_id);

CREATE INDEX IF NOT EXISTS idx_redemptions_client_id
  ON public.redemptions (client_id);

CREATE INDEX IF NOT EXISTS idx_redemptions_lead_id
  ON public.redemptions (lead_id);

CREATE INDEX IF NOT EXISTS idx_validation_lockouts_loyalty_account_id
  ON public.validation_lockouts (loyalty_account_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_campaign_id
  ON public.webhook_events (campaign_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_client_id
  ON public.webhook_events (client_id);
