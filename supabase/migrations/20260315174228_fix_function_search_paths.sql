/*
  # Fix Mutable Search Path on All Functions

  ## Summary
  Recreates all functions with `SET search_path = public` to prevent search_path
  injection attacks. Without a fixed search_path, a malicious user could create
  objects in their own schema that shadow public schema objects used by these
  functions.

  ## Functions Fixed
  - get_user_role
  - get_user_client_id
  - is_agency_admin
  - is_client_level_user
  - check_client_brand_limit
  - check_client_user_limit
  - check_client_campaign_limit
  - check_brand_member_limit
  - check_brand_loyalty_allocation
  - check_brand_leads_allocation
  - check_leads_brand_limit
  - sync_campaign_client_from_brand
  - sync_loyalty_account_brand_from_campaign
  - sync_lead_brand_from_campaign
*/

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
    (SELECT role::text FROM profiles WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_agency_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_client_level_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role() IN ('client', 'client_admin', 'staff', 'client_user');
$$;

CREATE OR REPLACE FUNCTION public.check_client_brand_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_client_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_client_campaign_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_brand_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_brand_loyalty_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enrolled_count integer;
  allocated_sum integer;
  client_max integer;
BEGIN
  SELECT COUNT(*) INTO enrolled_count
  FROM loyalty_accounts
  WHERE brand_id = NEW.id;

  IF NEW.loyalty_members_limit < enrolled_count THEN
    RAISE EXCEPTION 'Cannot set loyalty members limit to % — this brand already has % enrolled members.',
      NEW.loyalty_members_limit, enrolled_count;
  END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.check_brand_leads_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_leads_brand_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.sync_campaign_client_from_brand()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.brand_id IS NOT NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM brands
    WHERE id = NEW.brand_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_loyalty_account_brand_from_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.brand_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT brand_id INTO NEW.brand_id
    FROM campaigns
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_lead_brand_from_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.brand_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT brand_id INTO NEW.brand_id
    FROM campaigns
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;
