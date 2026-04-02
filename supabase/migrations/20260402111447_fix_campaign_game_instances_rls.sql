/*
  # Fix campaign_game_instances RLS Policies

  ## Summary
  The campaign_game_instances table had incorrect RLS policies that:
  1. Used `FOR ALL` which doesn't separate INSERT, UPDATE, DELETE, SELECT properly
  2. Didn't properly check access based on the parent campaign
  3. Didn't align with the campaigns table RLS pattern
  
  This migration replaces those policies with proper role-based access control
  that mirrors the campaigns table policies, ensuring users can only create/modify
  game instances for campaigns they have access to.

  ## Changes
  - Drop all existing RLS policies on campaign_game_instances
  - Create separate SELECT, INSERT, UPDATE, DELETE policies
  - Agency admins: full access to all game instances
  - Client admins and 'client' role: access to their client's game instances
  - Client users and staff: access based on brand permissions
  - Public: read access to instances of active campaigns

  ## Security
  - Ensures users can only create game instances for campaigns they own/manage
  - Prevents unauthorized access to game instance data
  - Aligns with the security model used for campaigns table
*/

-- Drop the existing overly broad policies
DROP POLICY IF EXISTS "Agency admins have full access to game instances" ON campaign_game_instances;
DROP POLICY IF EXISTS "Client admins can manage their game instances" ON campaign_game_instances;
DROP POLICY IF EXISTS "Client users can view game instances for permitted brands" ON campaign_game_instances;

-- ============================================================
-- SELECT POLICIES
-- ============================================================

-- SELECT: Agency admins see all game instances
CREATE POLICY "Agency admins can view all game instances"
  ON campaign_game_instances FOR SELECT
  TO authenticated
  USING (is_agency_admin());

-- SELECT: Client admins and client role see their own client's game instances
CREATE POLICY "Client admins can view their client game instances"
  ON campaign_game_instances FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  );

-- SELECT: Client users and staff see game instances for brands they have active permissions on
CREATE POLICY "Client users can view permitted brand game instances"
  ON campaign_game_instances FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaign_game_instances.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
    )
  );

-- SELECT: Public can read game instances of active campaigns
CREATE POLICY "Public can view active campaign game instances"
  ON campaign_game_instances FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_game_instances.campaign_id
        AND c.status = 'active'
    )
  );

-- ============================================================
-- INSERT POLICIES
-- ============================================================

-- INSERT: Agency admins can create game instances
CREATE POLICY "Agency admins can create game instances"
  ON campaign_game_instances FOR INSERT
  TO authenticated
  WITH CHECK (is_agency_admin());

-- INSERT: Client admins can create game instances for their client's campaigns
CREATE POLICY "Client admins can create their client game instances"
  ON campaign_game_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_game_instances.campaign_id
        AND c.client_id = get_user_client_id()
    )
  );

-- INSERT: Client users with add_campaign permission can create game instances
CREATE POLICY "Client users can create game instances for permitted brands"
  ON campaign_game_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaign_game_instances.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_add_campaign = true
    )
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_game_instances.campaign_id
        AND c.brand_id = campaign_game_instances.brand_id
    )
  );

-- ============================================================
-- UPDATE POLICIES
-- ============================================================

-- UPDATE: Agency admins can update any game instance
CREATE POLICY "Agency admins can update game instances"
  ON campaign_game_instances FOR UPDATE
  TO authenticated
  USING (is_agency_admin())
  WITH CHECK (is_agency_admin());

-- UPDATE: Client admins can update their client's game instances
CREATE POLICY "Client admins can update their client game instances"
  ON campaign_game_instances FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  );

-- UPDATE: Client users with edit permission can update game instances for permitted brands
CREATE POLICY "Client users can update permitted brand game instances"
  ON campaign_game_instances FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaign_game_instances.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaign_game_instances.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

-- ============================================================
-- DELETE POLICIES
-- ============================================================

-- DELETE: Agency admins can delete any game instance
CREATE POLICY "Agency admins can delete game instances"
  ON campaign_game_instances FOR DELETE
  TO authenticated
  USING (is_agency_admin());

-- DELETE: Client admins can delete their client's game instances
CREATE POLICY "Client admins can delete their client game instances"
  ON campaign_game_instances FOR DELETE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  );

-- DELETE: Client users with delete permission can delete game instances for permitted brands
CREATE POLICY "Client users can delete permitted brand game instances"
  ON campaign_game_instances FOR DELETE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaign_game_instances.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_delete_campaign = true
    )
  );
