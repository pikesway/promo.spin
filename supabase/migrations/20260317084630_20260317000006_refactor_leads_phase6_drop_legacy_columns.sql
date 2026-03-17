/*
  # Phase 6: Drop legacy columns

  ## Summary
  Removes all deprecated columns now that backfill is complete and
  all code paths have been updated.

  ## Columns dropped from leads
  - campaign_id — person uniqueness is now brand-scoped; campaign context
    belongs in metadata only
  - data jsonb — PII is now in real columns (name, email, phone)

  ## Columns dropped from loyalty_accounts
  - name — now in leads via lead_id FK
  - email — now in leads via lead_id FK
  - phone — now in leads via lead_id FK
  - birthday — now in leads via lead_id FK

  ## Indexes dropped
  - idx_leads_campaign_id — campaign_id is being removed
  - idx_leads_client_id removed and re-added (no change; kept for reference)

  ## Notes
  - redemptions.lead_id still points to leads.id — this FK is unaffected
  - loyalty_accounts child tables (progress_log, redemptions, etc.) are unaffected
  - This migration is irreversible
*/

-- ============================================================================
-- Drop legacy columns from leads
-- ============================================================================

DROP INDEX IF EXISTS idx_leads_campaign_id;

ALTER TABLE leads
  DROP COLUMN IF EXISTS campaign_id,
  DROP COLUMN IF EXISTS data;

-- ============================================================================
-- Drop PII columns from loyalty_accounts
-- ============================================================================

ALTER TABLE loyalty_accounts
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS birthday;
