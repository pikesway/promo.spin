/*
  # Phase 1: Refactor leads into canonical person table — Additive columns only

  ## Summary
  This migration adds new real columns to the leads table and a nullable lead_id FK
  to loyalty_accounts. No existing columns are removed yet. This phase is safe to
  deploy while existing code still runs.

  ## Changes to leads table
  - Add `name text` — canonical person name
  - Add `email text` — canonical person email (nullable; not all leads have email)
  - Add `phone text` — canonical person phone (nullable)
  - Add `birthday date` — person birthday (nullable)
  - Add `source_type text` — origin of the lead: 'game', 'loyalty', 'webhook'
  - Add `updated_at timestamptz` — auto-maintained by trigger

  ## Changes to loyalty_accounts table
  - Add `lead_id uuid` (nullable FK to leads.id) — will be made NOT NULL after backfill

  ## Indexes added
  - leads: index on email, phone
  - loyalty_accounts: index on lead_id

  ## Triggers added
  - update_leads_updated_at — keeps leads.updated_at current on every UPDATE

  ## Notes
  - No columns are removed in this phase
  - lead_id is nullable so existing rows are not broken
  - The partial unique indexes on leads are added in Phase 4 after backfill
*/

-- ============================================================================
-- STEP 1: Add new person columns to leads
-- ============================================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================================================
-- STEP 2: Add updated_at trigger to leads
-- ============================================================================

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 3: Add indexes for new person columns on leads
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

-- ============================================================================
-- STEP 4: Add nullable lead_id FK to loyalty_accounts
-- ============================================================================

ALTER TABLE loyalty_accounts
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_lead_id ON loyalty_accounts(lead_id);
