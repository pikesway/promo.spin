/*
  # Limit Enforcement Functions and Triggers

  ## Summary
  Adds database-level limit checks to prevent exceeding configured limits.

  ## Functions Added
  - check_client_brand_limit: checks if client is at active brands limit
  - check_client_user_limit: checks if client is at active users limit
  - check_client_campaign_limit: checks if client is at active campaigns limit
  - check_brand_member_limit: checks if brand is at loyalty members limit

  ## Triggers Added
  - Before INSERT on brands: enforce active_brands_limit
  - Before INSERT on profiles (client users): enforce active_users_limit
  - Before UPDATE on campaigns (status -> active): enforce active_campaigns_limit
  - Before INSERT on loyalty_accounts: enforce loyalty_members_limit
*/

-- ============================================================================
-- Limit check functions
-- ============================================================================

CREATE OR REPLACE FUNCTION check_client_brand_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_limit integer;
BEGIN
  IF NEW.active = true THEN
    SELECT COUNT(*) INTO current_count
    FROM brands
    WHERE client_id = NEW.client_id AND active = true
      AND (TG_OP = 'INSERT' OR id != NEW.id);

    SELECT active_brands_limit INTO max_limit
    FROM clients
    WHERE id = NEW.client_id;

    IF max_limit IS NOT NULL AND current_count >= max_limit THEN
      RAISE EXCEPTION 'Client has reached the maximum number of active brands (%). Contact your administrator to increase the limit.', max_limit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_client_user_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_limit integer;
BEGIN
  IF NEW.client_id IS NOT NULL AND NEW.is_active = true THEN
    SELECT COUNT(*) INTO current_count
    FROM profiles
    WHERE client_id = NEW.client_id AND is_active = true
      AND role IN ('client', 'client_admin', 'staff', 'client_user')
      AND (TG_OP = 'INSERT' OR id != NEW.id);

    SELECT active_users_limit INTO max_limit
    FROM clients
    WHERE id = NEW.client_id;

    IF max_limit IS NOT NULL AND current_count >= max_limit THEN
      RAISE EXCEPTION 'Client has reached the maximum number of active users (%). Contact your administrator to increase the limit.', max_limit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_client_campaign_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_limit integer;
  v_client_id uuid;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    v_client_id := NEW.client_id;

    IF v_client_id IS NULL AND NEW.brand_id IS NOT NULL THEN
      SELECT client_id INTO v_client_id FROM brands WHERE id = NEW.brand_id;
    END IF;

    IF v_client_id IS NOT NULL THEN
      SELECT COUNT(*) INTO current_count
      FROM campaigns
      WHERE client_id = v_client_id AND status = 'active'
        AND id != NEW.id;

      SELECT active_campaigns_limit INTO max_limit
      FROM clients
      WHERE id = v_client_id;

      IF max_limit IS NOT NULL AND current_count >= max_limit THEN
        RAISE EXCEPTION 'Client has reached the maximum number of active campaigns (%). Contact your administrator to increase the limit.', max_limit;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_brand_member_limit()
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
    FROM loyalty_accounts
    WHERE brand_id = v_brand_id;

    SELECT loyalty_members_limit INTO max_limit
    FROM brands
    WHERE id = v_brand_id;

    IF max_limit IS NOT NULL AND current_count >= max_limit THEN
      RAISE EXCEPTION 'This brand has reached the maximum number of loyalty members (%). Contact your administrator to increase the limit.', max_limit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Limit enforcement triggers
-- ============================================================================

DROP TRIGGER IF EXISTS enforce_brand_limit ON brands;
CREATE TRIGGER enforce_brand_limit
  BEFORE INSERT OR UPDATE OF active ON brands
  FOR EACH ROW
  EXECUTE FUNCTION check_client_brand_limit();

DROP TRIGGER IF EXISTS enforce_user_limit ON profiles;
CREATE TRIGGER enforce_user_limit
  BEFORE INSERT OR UPDATE OF is_active ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_client_user_limit();

DROP TRIGGER IF EXISTS enforce_campaign_limit ON campaigns;
CREATE TRIGGER enforce_campaign_limit
  BEFORE UPDATE OF status ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION check_client_campaign_limit();

DROP TRIGGER IF EXISTS enforce_member_limit ON loyalty_accounts;
CREATE TRIGGER enforce_member_limit
  BEFORE INSERT ON loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION check_brand_member_limit();
