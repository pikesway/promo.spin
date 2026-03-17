/*
  # Phase 5: Update trigger functions for new leads schema

  ## Summary
  Updates trigger functions that referenced leads.campaign_id (which is being removed)
  and removes the trigger that auto-populated brand_id from campaign_id on leads.

  ## Changes

  ### check_leads_brand_limit()
  - Previously fell back to deriving brand_id from campaign_id join if brand_id was null
  - After this change: reads brand_id directly from NEW.brand_id only
  - campaign_id is being removed from leads, so the join fallback must be removed

  ### sync_lead_brand_from_campaign trigger (REMOVED)
  - Previously auto-populated leads.brand_id by looking up campaign.brand_id
  - After this refactor, brand_id is always passed explicitly on insert
  - This trigger is no longer needed and is dropped

  ## Notes
  - The check_brand_leads_allocation function is unchanged (operates on brands table)
  - The check_brand_loyalty_allocation function is unchanged
  - All other limit triggers are unchanged
*/

-- ============================================================================
-- Update check_leads_brand_limit to not use campaign_id fallback
-- ============================================================================

CREATE OR REPLACE FUNCTION check_leads_brand_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_limit integer;
BEGIN
  IF NEW.brand_id IS NOT NULL THEN
    SELECT COUNT(*) INTO current_count
    FROM leads
    WHERE brand_id = NEW.brand_id;

    SELECT leads_limit INTO max_limit
    FROM brands
    WHERE id = NEW.brand_id;

    IF max_limit IS NOT NULL AND current_count >= max_limit THEN
      RAISE EXCEPTION 'This brand has reached the maximum number of leads (%). Contact your administrator to increase the limit.', max_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Remove the old trigger that auto-populated brand_id from campaign_id
-- ============================================================================

DROP TRIGGER IF EXISTS lead_sync_brand ON leads;
DROP FUNCTION IF EXISTS sync_lead_brand_from_campaign();
