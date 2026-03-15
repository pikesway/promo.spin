/*
  # Fix campaigns RLS policies and secure related tables

  ## Summary
  The campaigns table had completely open RLS policies using the `public` role with
  `qual = true`, meaning anyone (including unauthenticated users) could read, write,
  update, and delete any campaign. This migration replaces those policies with proper
  role-based access control.

  ## Changes

  ### campaigns table
  - Drops the 4 open `public` policies (Anyone can view/create/update/delete campaigns)
  - Adds proper SELECT policy: super_admin/admin see all; client roles see their own client's campaigns; client_users see campaigns for brands they have active permissions on; public can read active campaigns by slug (for game/loyalty player pages)
  - Adds proper INSERT policy: agency admins and client admins can create campaigns
  - Adds proper UPDATE policy: agency admins and client admins can update their campaigns; client_users with edit permission can update
  - Adds proper DELETE policy: agency admins and client admins can delete their campaigns

  ## Security
  - Removes unauthenticated write access to campaigns
  - Client users can only see campaigns for brands they are explicitly granted access to
  - Public read access retained only for active campaigns (needed for game/loyalty player pages)
*/

-- Drop the insecure open policies
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Anyone can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Anyone can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Anyone can delete campaigns" ON campaigns;

-- SELECT: Agency/super admins see all campaigns
CREATE POLICY "Agency admins can view all campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (is_agency_admin());

-- SELECT: Client admins and client role see their own client's campaigns
CREATE POLICY "Client admins can view their client campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  );

-- SELECT: Client users and staff see campaigns for brands they have active permissions on
CREATE POLICY "Client users can view permitted brand campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaigns.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
    )
  );

-- SELECT: Public can read active campaigns by slug (needed for game/loyalty player pages)
CREATE POLICY "Public can view active campaigns"
  ON campaigns FOR SELECT
  TO public
  USING (status = 'active');

-- INSERT: Agency admins can create campaigns
CREATE POLICY "Agency admins can create campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (is_agency_admin());

-- INSERT: Client admins can create campaigns for their client
CREATE POLICY "Client admins can create their client campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  );

-- INSERT: Client users with add_campaign permission can create campaigns
CREATE POLICY "Client users can create campaigns for permitted brands"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaigns.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_add_campaign = true
    )
  );

-- UPDATE: Agency admins can update any campaign
CREATE POLICY "Agency admins can update campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (is_agency_admin())
  WITH CHECK (is_agency_admin());

-- UPDATE: Client admins can update their client's campaigns
CREATE POLICY "Client admins can update their client campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  );

-- UPDATE: Client users with edit permission can update campaigns for permitted brands
CREATE POLICY "Client users can update permitted brand campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaigns.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaigns.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_edit_campaign = true
    )
  );

-- DELETE: Agency admins can delete any campaign
CREATE POLICY "Agency admins can delete campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (is_agency_admin());

-- DELETE: Client admins can delete their client's campaigns
CREATE POLICY "Client admins can delete their client campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['client'::text, 'client_admin'::text])
    AND client_id = get_user_client_id()
  );

-- DELETE: Client users with delete permission can delete campaigns for permitted brands
CREATE POLICY "Client users can delete permitted brand campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['staff'::text, 'client_user'::text])
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions ubp
      WHERE ubp.brand_id = campaigns.brand_id
        AND ubp.user_id = auth.uid()
        AND ubp.active = true
        AND ubp.can_delete_campaign = true
    )
  );
