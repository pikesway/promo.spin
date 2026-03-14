/*
  # Fix Database Security Issues

  ## Critical Security Fixes
  
  ### 1. RLS Policy Security
  - Remove "always true" policies that bypass security
  - Replace with proper authentication-based policies
  - Maintain public access only where needed (game plays, lead capture)
  
  ### 2. Performance Improvements
  - Add missing indexes on foreign keys:
    - clients.agency_id
    - redemptions.client_id
    - redemptions.lead_id
  
  ### 3. Function Security
  - Fix search_path security issues in database functions
  
  ### 4. Cleanup
  - Remove unused indexes that add overhead without benefit

  ## Access Control Model
  
  Public tables (game players):
  - game_plays (INSERT only)
  - leads (INSERT only)
  - redemptions (INSERT only)
  - campaigns (SELECT only - to view/play games)
  
  Authenticated tables (admin/agency users):
  - agencies (full CRUD with authentication)
  - clients (full CRUD with authentication)
  - campaigns (CREATE/UPDATE/DELETE with authentication)
  - prize_inventory (full CRUD with authentication)
  - redemptions (UPDATE with authentication)
*/

-- ============================================================================
-- 1. DROP INSECURE RLS POLICIES
-- ============================================================================

-- Drop all "always true" policies on agencies
DROP POLICY IF EXISTS "Anyone can create agencies" ON public.agencies;
DROP POLICY IF EXISTS "Anyone can update agencies" ON public.agencies;

-- Drop insecure campaign policies
DROP POLICY IF EXISTS "Anyone can create campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Anyone can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Anyone can update campaigns" ON public.campaigns;

-- Drop insecure client policies
DROP POLICY IF EXISTS "Anyone can create clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can update clients" ON public.clients;

-- Drop insecure prize inventory policy
DROP POLICY IF EXISTS "Authenticated users can insert prize inventory" ON public.prize_inventory;

-- Drop insecure redemption update policy (keep insert for public redemptions)
DROP POLICY IF EXISTS "Anyone can update redemptions" ON public.redemptions;

-- ============================================================================
-- 2. CREATE SECURE RLS POLICIES
-- ============================================================================

-- AGENCIES: Require authentication for all operations
CREATE POLICY "Authenticated users can view agencies"
  ON public.agencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create agencies"
  ON public.agencies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update agencies"
  ON public.agencies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete agencies"
  ON public.agencies FOR DELETE
  TO authenticated
  USING (true);

-- CLIENTS: Require authentication for all operations
CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (true);

-- CAMPAIGNS: Public can view (to play games), authenticated can modify
CREATE POLICY "Authenticated users can create campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (true);

-- PRIZE INVENTORY: Require authentication
CREATE POLICY "Authenticated users can view prize inventory"
  ON public.prize_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create prize inventory"
  ON public.prize_inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update prize inventory"
  ON public.prize_inventory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete prize inventory"
  ON public.prize_inventory FOR DELETE
  TO authenticated
  USING (true);

-- REDEMPTIONS: Authenticated can update (for status changes)
CREATE POLICY "Authenticated users can update redemptions"
  ON public.redemptions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view redemptions"
  ON public.redemptions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 3. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index for clients.agency_id foreign key
CREATE INDEX IF NOT EXISTS idx_clients_agency_id 
  ON public.clients(agency_id);

-- Index for redemptions.client_id foreign key
CREATE INDEX IF NOT EXISTS idx_redemptions_client_id 
  ON public.redemptions(client_id);

-- Index for redemptions.lead_id foreign key
CREATE INDEX IF NOT EXISTS idx_redemptions_lead_id 
  ON public.redemptions(lead_id);

-- ============================================================================
-- 4. FIX FUNCTION SECURITY (search_path mutable issues)
-- ============================================================================

-- Drop and recreate update_updated_at_column with secure search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop and recreate update_client_status_timestamp with secure search_path
DROP FUNCTION IF EXISTS public.update_client_status_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION public.update_client_status_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'active' THEN
      NEW.activated_at = now();
    ELSIF NEW.status = 'inactive' THEN
      NEW.deactivated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate decrement_prize_inventory with secure search_path
DROP FUNCTION IF EXISTS public.decrement_prize_inventory() CASCADE;
CREATE OR REPLACE FUNCTION public.decrement_prize_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_win AND NEW.outcome_prize_name IS NOT NULL THEN
    UPDATE public.prize_inventory
    SET remaining_quantity = remaining_quantity - 1
    WHERE campaign_id = NEW.campaign_id
      AND prize_name = NEW.outcome_prize_name
      AND remaining_quantity > 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers for the functions we dropped
DROP TRIGGER IF EXISTS update_updated_at ON public.agencies CASCADE;
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_updated_at ON public.clients CASCADE;
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_updated_at ON public.campaigns CASCADE;
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_status_timestamp ON public.clients CASCADE;
CREATE TRIGGER update_client_status_timestamp
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_status_timestamp();

DROP TRIGGER IF EXISTS decrement_prize_inventory_trigger ON public.game_plays CASCADE;
CREATE TRIGGER decrement_prize_inventory_trigger
  AFTER INSERT ON public.game_plays
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_prize_inventory();

-- ============================================================================
-- 5. REMOVE UNUSED INDEXES (reducing overhead)
-- ============================================================================

DROP INDEX IF EXISTS public.idx_clients_status;
DROP INDEX IF EXISTS public.idx_prize_inventory_campaign;
DROP INDEX IF EXISTS public.idx_game_plays_campaign;
DROP INDEX IF EXISTS public.idx_game_plays_session;
DROP INDEX IF EXISTS public.idx_game_plays_played_at;
DROP INDEX IF EXISTS public.idx_campaigns_slug;
DROP INDEX IF EXISTS public.idx_campaigns_client_id;
DROP INDEX IF EXISTS public.idx_campaigns_status;
DROP INDEX IF EXISTS public.idx_leads_client_id;
DROP INDEX IF EXISTS public.idx_redemptions_short_code;
DROP INDEX IF EXISTS public.idx_redemptions_status;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Auth DB Connection Strategy:
-- This requires manual configuration in Supabase dashboard settings.
-- Navigate to: Settings > Database > Connection Pooling
-- Change from fixed number to percentage-based allocation.
-- This cannot be fixed via migration.
