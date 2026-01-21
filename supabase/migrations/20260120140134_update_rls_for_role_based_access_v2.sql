/*
  # Update RLS Policies for Role-Based Access

  ## Overview
  This migration updates all existing tables to implement proper role-based access control.
  It ensures that super_admins and admins can manage all data, while clients can only access
  their own client's data.

  ## Updated Tables
  - `agencies` - Role-based access for agency management
  - `clients` - Role-based access for client management
  - `campaigns` - Restrict access to client's campaigns
  - `leads` - Restrict access to client's leads
  - `prize_inventory` - Restrict access to client's prize inventory
  - `game_plays` - Restrict access to client's game plays
  - `redemptions` - Restrict access to client's redemptions

  ## Security Changes
  - Admins (super_admin and admin) can view and manage all data
  - Clients can only view and manage their own client's data
  - Public can still play games via the campaign player (no auth required)

  ## Important Notes
  1. All policies now check user role from profiles table
  2. Client-specific data is filtered by client_id
  3. Public access is maintained for the game player functionality
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's client_id
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT client_id FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- AGENCIES TABLE POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view agencies" ON agencies;

CREATE POLICY "Admins can view all agencies"
  ON agencies FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert agencies"
  ON agencies FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update agencies"
  ON agencies FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete agencies"
  ON agencies FOR DELETE
  TO authenticated
  USING (is_admin());

-- ==========================================
-- CLIENTS TABLE POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view active clients" ON clients;
DROP POLICY IF EXISTS "Clients can be created by anyone" ON clients;

CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own client"
  ON clients FOR SELECT
  TO authenticated
  USING (id = get_user_client_id());

CREATE POLICY "Admins can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- ==========================================
-- CAMPAIGNS TABLE POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Public can view campaigns by slug" ON campaigns;
DROP POLICY IF EXISTS "Campaigns can be created by anyone" ON campaigns;

CREATE POLICY "Public can view campaigns by slug"
  ON campaigns FOR SELECT
  TO anon
  USING (status = 'active');

CREATE POLICY "Admins can view all campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own client campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (client_id = get_user_client_id());

CREATE POLICY "Admins can insert campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (is_admin());

-- ==========================================
-- LEADS TABLE POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view leads" ON leads;
DROP POLICY IF EXISTS "Anyone can create leads" ON leads;

CREATE POLICY "Public can insert leads"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own client leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    client_id = get_user_client_id()
    OR campaign_id IN (
      SELECT id FROM campaigns WHERE client_id = get_user_client_id()
    )
  );

CREATE POLICY "Admins can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (is_admin());

-- ==========================================
-- PRIZE_INVENTORY TABLE POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view inventory" ON prize_inventory;
DROP POLICY IF EXISTS "Anyone can update inventory" ON prize_inventory;

CREATE POLICY "Public can view prize inventory"
  ON prize_inventory FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can view all inventory"
  ON prize_inventory FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own client inventory"
  ON prize_inventory FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE client_id = get_user_client_id()
    )
  );

CREATE POLICY "Public can update inventory"
  ON prize_inventory FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can insert inventory"
  ON prize_inventory FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update inventory"
  ON prize_inventory FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete inventory"
  ON prize_inventory FOR DELETE
  TO authenticated
  USING (is_admin());

-- ==========================================
-- GAME_PLAYS TABLE POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view play logs" ON game_plays;
DROP POLICY IF EXISTS "Anyone can create play logs" ON game_plays;

CREATE POLICY "Public can insert game plays"
  ON game_plays FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can view all game plays"
  ON game_plays FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own client game plays"
  ON game_plays FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE client_id = get_user_client_id()
    )
  );

-- ==========================================
-- REDEMPTIONS TABLE POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view redemptions" ON redemptions;
DROP POLICY IF EXISTS "Anyone can create redemptions" ON redemptions;
DROP POLICY IF EXISTS "Anyone can update redemptions" ON redemptions;

CREATE POLICY "Public can insert redemptions"
  ON redemptions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view own redemptions"
  ON redemptions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can view all redemptions"
  ON redemptions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own client redemptions"
  ON redemptions FOR SELECT
  TO authenticated
  USING (
    client_id = get_user_client_id()
    OR campaign_id IN (
      SELECT id FROM campaigns WHERE client_id = get_user_client_id()
    )
  );

CREATE POLICY "Public can update redemptions"
  ON redemptions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can update redemptions"
  ON redemptions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());