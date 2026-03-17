/*
  # Phase 4: Constraint swap — enforce new uniqueness rules

  ## Summary
  1. Makes loyalty_accounts.lead_id NOT NULL (all rows are backfilled)
  2. Drops UNIQUE(campaign_id, email) from loyalty_accounts
  3. Drops index on loyalty_accounts.email
  4. Adds UNIQUE(campaign_id, lead_id) to loyalty_accounts
  5. Adds partial unique indexes on leads for deduplication (email + phone)

  ## Notes
  - Deduplication of leads was completed in the previous migration
  - These indexes are now safe to create
*/

-- Make lead_id NOT NULL
ALTER TABLE loyalty_accounts
  ALTER COLUMN lead_id SET NOT NULL;

-- Drop old email-based unique constraint and index
ALTER TABLE loyalty_accounts
  DROP CONSTRAINT IF EXISTS loyalty_accounts_campaign_id_email_key;

DROP INDEX IF EXISTS idx_loyalty_accounts_email;

-- Add new UNIQUE(campaign_id, lead_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loyalty_accounts_campaign_id_lead_id_key'
      AND conrelid = 'loyalty_accounts'::regclass
  ) THEN
    ALTER TABLE loyalty_accounts
      ADD CONSTRAINT loyalty_accounts_campaign_id_lead_id_key UNIQUE (campaign_id, lead_id);
  END IF;
END $$;

-- Partial unique index on leads: one person per brand per email
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_brand_email_unique
  ON leads (brand_id, lower(email))
  WHERE email IS NOT NULL;

-- Partial unique index on leads: one person per brand per phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_brand_phone_unique
  ON leads (brand_id, lower(phone))
  WHERE phone IS NOT NULL;
