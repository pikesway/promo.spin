/*
  # Fix RLS Policies for Unauthenticated Application

  ## Issue
  The application does not use authentication - all users access via the anon key.
  Previous policies restricted admin operations to authenticated users only.

  ## Solution
  Update policies to allow anonymous (public) users to perform admin operations
  while maintaining data validation and integrity checks.

  ## Security Note
  This application appears to be an internal tool. For production use with
  external access, implement proper authentication and restrict these policies
  to authenticated users only.
*/

-- ============================================================================
-- AGENCIES: Allow public access with validation
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view agencies" ON public.agencies;
CREATE POLICY "Users can view agencies"
  ON public.agencies FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create agencies" ON public.agencies;
CREATE POLICY "Users can create agencies"
  ON public.agencies FOR INSERT
  TO public
  WITH CHECK (
    name IS NOT NULL AND 
    email IS NOT NULL AND 
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

DROP POLICY IF EXISTS "Authenticated users can update agencies" ON public.agencies;
CREATE POLICY "Users can update agencies"
  ON public.agencies FOR UPDATE
  TO public
  USING (id IS NOT NULL)
  WITH CHECK (
    name IS NOT NULL AND 
    email IS NOT NULL AND 
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

DROP POLICY IF EXISTS "Authenticated users can delete agencies" ON public.agencies;
CREATE POLICY "Users can delete agencies"
  ON public.agencies FOR DELETE
  TO public
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.clients WHERE clients.agency_id = agencies.id
    )
  );

-- ============================================================================
-- CLIENTS: Allow public access with validation
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Users can view clients"
  ON public.clients FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;
CREATE POLICY "Users can create clients"
  ON public.clients FOR INSERT
  TO public
  WITH CHECK (
    name IS NOT NULL AND 
    email IS NOT NULL AND 
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
    (agency_id IS NULL OR EXISTS (
      SELECT 1 FROM public.agencies WHERE agencies.id = agency_id
    ))
  );

DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
CREATE POLICY "Users can update clients"
  ON public.clients FOR UPDATE
  TO public
  USING (id IS NOT NULL)
  WITH CHECK (
    name IS NOT NULL AND 
    email IS NOT NULL AND 
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
    (agency_id IS NULL OR EXISTS (
      SELECT 1 FROM public.agencies WHERE agencies.id = agency_id
    ))
  );

DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
CREATE POLICY "Users can delete clients"
  ON public.clients FOR DELETE
  TO public
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.campaigns WHERE campaigns.client_id = clients.id
    )
  );

-- ============================================================================
-- CAMPAIGNS: Allow public view for players, full access for admin
-- ============================================================================

-- Keep existing public SELECT policy for game players
-- (Already allows public to view active campaigns)

DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON public.campaigns;
CREATE POLICY "Users can create campaigns"
  ON public.campaigns FOR INSERT
  TO public
  WITH CHECK (
    name IS NOT NULL AND 
    slug IS NOT NULL AND 
    type IN ('spin', 'scratch') AND
    (client_id IS NULL OR EXISTS (
      SELECT 1 FROM public.clients WHERE clients.id = client_id
    ))
  );

DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.campaigns;
CREATE POLICY "Users can update campaigns"
  ON public.campaigns FOR UPDATE
  TO public
  USING (id IS NOT NULL)
  WITH CHECK (
    name IS NOT NULL AND 
    slug IS NOT NULL AND 
    type IN ('spin', 'scratch') AND
    (client_id IS NULL OR EXISTS (
      SELECT 1 FROM public.clients WHERE clients.id = client_id
    ))
  );

DROP POLICY IF EXISTS "Authenticated users can delete campaigns" ON public.campaigns;
CREATE POLICY "Users can delete campaigns"
  ON public.campaigns FOR DELETE
  TO public
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.game_plays WHERE game_plays.campaign_id = campaigns.id
    )
  );

-- ============================================================================
-- PRIZE INVENTORY: Allow public access with validation
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view prize inventory" ON public.prize_inventory;
CREATE POLICY "Users can view prize inventory"
  ON public.prize_inventory FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create prize inventory" ON public.prize_inventory;
CREATE POLICY "Users can create prize inventory"
  ON public.prize_inventory FOR INSERT
  TO public
  WITH CHECK (
    campaign_id IS NOT NULL AND
    prize_name IS NOT NULL AND
    initial_quantity >= 0 AND
    remaining_quantity >= 0 AND
    EXISTS (
      SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update prize inventory" ON public.prize_inventory;
CREATE POLICY "Users can update prize inventory"
  ON public.prize_inventory FOR UPDATE
  TO public
  USING (id IS NOT NULL)
  WITH CHECK (
    campaign_id IS NOT NULL AND
    prize_name IS NOT NULL AND
    initial_quantity >= 0 AND
    remaining_quantity >= 0 AND
    EXISTS (
      SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete prize inventory" ON public.prize_inventory;
CREATE POLICY "Users can delete prize inventory"
  ON public.prize_inventory FOR DELETE
  TO public
  USING (id IS NOT NULL);

-- ============================================================================
-- REDEMPTIONS: Keep existing public insert, allow public update
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view redemptions" ON public.redemptions;
CREATE POLICY "Users can view redemptions"
  ON public.redemptions FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update redemptions" ON public.redemptions;
CREATE POLICY "Users can update redemptions"
  ON public.redemptions FOR UPDATE
  TO public
  USING (id IS NOT NULL)
  WITH CHECK (
    status IN ('valid', 'redeemed', 'expired')
  );

-- ============================================================================
-- GAME PLAYS & LEADS: Keep existing public policies
-- ============================================================================
-- These already allow public access correctly

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- All tables now allow public access for CRUD operations with validation.
-- Game players can: view campaigns, create game_plays, leads, and redemptions
-- Admin users can: manage agencies, clients, campaigns, and prize inventory
-- All operations maintain data integrity through validation checks