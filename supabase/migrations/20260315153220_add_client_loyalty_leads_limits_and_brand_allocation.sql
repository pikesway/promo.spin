/*
  # Add Loyalty Members & Leads Limits at Client Level, Leads Limit at Brand Level

  ## Summary
  This migration adds two new limit columns to the clients table (controlled by Super Admin only),
  a leads_limit column to brands, and updates trigger functions to enforce allocation rules.

  ## New Columns

  ### clients table
  - `loyalty_members_limit` (integer, default 1000) — total loyalty members allowed across ALL brands
  - `leads_limit` (integer, default 5000) — total leads allowed across ALL brands

  ### brands table
  - `leads_limit` (integer, default 500) — per-brand leads cap; sum across brands cannot exceed client's leads_limit

  ## Updated Trigger Logic

  1. `check_brand_member_limit` — updated to also block if the brand's proposed loyalty_members_limit
     would push the SUM of all brand limits over the client's loyalty_members_limit (on INSERT/UPDATE).

  2. `check_brand_leads_limit` — new trigger: enforces leads_limit on the leads table.
     Blocks new leads if the brand has reached its leads_limit.

  3. `check_brand_loyalty_allocation` — new trigger on brands table.
     On INSERT or UPDATE of loyalty_members_limit, ensures sum of all brand limits
     for the client does not exceed client.loyalty_members_limit.
     Also ensures loyalty_members_limit is not set lower than existing enrolled members.

  4. `check_brand_leads_allocation` — new trigger on brands table.
     On INSERT or UPDATE of leads_limit, ensures sum of all brand leads_limit
     for the client does not exceed client.leads_limit.

  ## Security
  - No RLS changes needed here; RLS policies already exist for brands and leads.
  - Trigger functions run as SECURITY DEFINER (same as existing pattern).
*/

-- ============================================================================
-- STEP 1: Add new columns to clients table
-- ============================================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS loyalty_members_limit integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS leads_limit integer DEFAULT 5000;

-- ============================================================================
-- STEP 2: Add leads_limit column to brands table
-- ============================================================================

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS leads_limit integer DEFAULT 500;

-- ============================================================================
-- STEP 3: Update check_brand_member_limit to also validate enrolled count
--         This fires before INSERT on loyalty_accounts (existing trigger).
--         No change needed — existing logic is correct.
--
-- STEP 4: New trigger — check_brand_loyalty_allocation
--         Fires before INSERT or UPDATE of loyalty_members_limit on brands.
--         Validates:
--           a) The new limit is not lower than current enrolled member count.
--           b) Sum of all brand loyalty_members_limit for the client
--              does not exceed client.loyalty_members_limit.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_brand_loyalty_allocation()
RETURNS TRIGGER AS $$
DECLARE
  enrolled_count integer;
  allocated_sum integer;
  client_max integer;
BEGIN
  -- a) Cannot set limit lower than currently enrolled members for this brand
  SELECT COUNT(*) INTO enrolled_count
  FROM loyalty_accounts
  WHERE brand_id = NEW.id;

  IF NEW.loyalty_members_limit < enrolled_count THEN
    RAISE EXCEPTION 'Cannot set loyalty members limit to % — this brand already has % enrolled members.',
      NEW.loyalty_members_limit, enrolled_count;
  END IF;

  -- b) Sum of all brand limits (excluding this brand) + new value must not exceed client limit
  SELECT COALESCE(SUM(loyalty_members_limit), 0) INTO allocated_sum
  FROM brands
  WHERE client_id = NEW.client_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  SELECT loyalty_members_limit INTO client_max
  FROM clients
  WHERE id = NEW.client_id;

  IF client_max IS NOT NULL AND (allocated_sum + NEW.loyalty_members_limit) > client_max THEN
    RAISE EXCEPTION 'Brand loyalty members limit would exceed the client total limit of %. Currently % allocated across other brands, % available.',
      client_max, allocated_sum, (client_max - allocated_sum);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_brand_loyalty_allocation ON brands;
CREATE TRIGGER enforce_brand_loyalty_allocation
  BEFORE INSERT OR UPDATE OF loyalty_members_limit ON brands
  FOR EACH ROW
  EXECUTE FUNCTION check_brand_loyalty_allocation();

-- ============================================================================
-- STEP 5: New trigger — check_brand_leads_allocation
--         Fires before INSERT or UPDATE of leads_limit on brands.
--         Validates sum of all brand leads_limit does not exceed client.leads_limit.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_brand_leads_allocation()
RETURNS TRIGGER AS $$
DECLARE
  allocated_sum integer;
  client_max integer;
BEGIN
  SELECT COALESCE(SUM(leads_limit), 0) INTO allocated_sum
  FROM brands
  WHERE client_id = NEW.client_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  SELECT leads_limit INTO client_max
  FROM clients
  WHERE id = NEW.client_id;

  IF client_max IS NOT NULL AND (allocated_sum + NEW.leads_limit) > client_max THEN
    RAISE EXCEPTION 'Brand leads limit would exceed the client total limit of %. Currently % allocated across other brands, % available.',
      client_max, allocated_sum, (client_max - allocated_sum);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_brand_leads_allocation ON brands;
CREATE TRIGGER enforce_brand_leads_allocation
  BEFORE INSERT OR UPDATE OF leads_limit ON brands
  FOR EACH ROW
  EXECUTE FUNCTION check_brand_leads_allocation();

-- ============================================================================
-- STEP 6: New trigger — check_leads_brand_limit
--         Fires before INSERT on leads.
--         Blocks new leads if brand has reached its leads_limit.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_leads_brand_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_limit integer;
  v_brand_id uuid;
BEGIN
  v_brand_id := NEW.brand_id;

  IF v_brand_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT brand_id INTO v_brand_id FROM campaigns WHERE id = NEW.campaign_id;
  END IF;

  IF v_brand_id IS NOT NULL THEN
    SELECT COUNT(*) INTO current_count
    FROM leads
    WHERE brand_id = v_brand_id;

    SELECT leads_limit INTO max_limit
    FROM brands
    WHERE id = v_brand_id;

    IF max_limit IS NOT NULL AND current_count >= max_limit THEN
      RAISE EXCEPTION 'This brand has reached the maximum number of leads (%). Contact your administrator to increase the limit.', max_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_leads_brand_limit ON leads;
CREATE TRIGGER enforce_leads_brand_limit
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION check_leads_brand_limit();
