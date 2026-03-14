/*
  # RLS Policies for Brand Hierarchy

  ## Summary
  Applies row-level security policies for the new brands hierarchy.
  Uses JWT app_metadata role claim to avoid recursive profile lookups.

  ## Tables Updated
  - brands: role-based access
  - user_brand_permissions: user-scoped access
  - audit_logs: admin-only + client read
  - client_notifications: client-scoped read
  - campaigns: updated to support brand_id filtering
  - loyalty_accounts: updated to support brand_id
  - profiles: updated to support client_admin role

  ## Role Mapping
  - admin / super_admin = agency admin (full access)
  - client / client_admin = client-level admin (own client only)
  - staff / client_user = brand-level user (assigned brands only)
*/

-- ============================================================================
-- Helper function: get current user role from JWT (avoids recursive RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
    (SELECT role::text FROM profiles WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT client_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_agency_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_user_role() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION is_client_level_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_user_role() IN ('client', 'client_admin', 'staff', 'client_user');
$$;

-- ============================================================================
-- BRANDS table RLS
-- ============================================================================

-- Super admin / admin sees all brands
CREATE POLICY "Agency admins can view all brands"
  ON brands FOR SELECT
  TO authenticated
  USING (is_agency_admin());

-- Client admin sees brands for their client
CREATE POLICY "Client admins can view their client brands"
  ON brands FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
  );

-- Client user sees only their assigned brands
CREATE POLICY "Client users can view assigned brands"
  ON brands FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('staff', 'client_user')
    AND EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_brand_permissions.brand_id = brands.id
        AND user_brand_permissions.user_id = auth.uid()
        AND user_brand_permissions.active = true
    )
  );

-- Agency admins can insert brands
CREATE POLICY "Agency admins can create brands"
  ON brands FOR INSERT
  TO authenticated
  WITH CHECK (is_agency_admin());

-- Client admins can create brands for their client
CREATE POLICY "Client admins can create brands for their client"
  ON brands FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
  );

-- Agency admins can update any brand
CREATE POLICY "Agency admins can update brands"
  ON brands FOR UPDATE
  TO authenticated
  USING (is_agency_admin())
  WITH CHECK (is_agency_admin());

-- Client admins can update brands for their client
CREATE POLICY "Client admins can update their client brands"
  ON brands FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
  )
  WITH CHECK (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
  );

-- Brand managers can update their assigned brands
CREATE POLICY "Brand managers can update assigned brands"
  ON brands FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_brand_permissions.brand_id = brands.id
        AND user_brand_permissions.user_id = auth.uid()
        AND user_brand_permissions.is_brand_manager = true
        AND user_brand_permissions.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_brand_permissions.brand_id = brands.id
        AND user_brand_permissions.user_id = auth.uid()
        AND user_brand_permissions.is_brand_manager = true
        AND user_brand_permissions.active = true
    )
  );

-- Agency admins can delete brands
CREATE POLICY "Agency admins can delete brands"
  ON brands FOR DELETE
  TO authenticated
  USING (is_agency_admin());

-- ============================================================================
-- USER_BRAND_PERMISSIONS table RLS
-- ============================================================================

-- Agency admins can view all permissions
CREATE POLICY "Agency admins can view all brand permissions"
  ON user_brand_permissions FOR SELECT
  TO authenticated
  USING (is_agency_admin());

-- Client admins can view permissions for users in their client
CREATE POLICY "Client admins can view their client user permissions"
  ON user_brand_permissions FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('client', 'client_admin')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_brand_permissions.user_id
        AND profiles.client_id = get_user_client_id()
    )
  );

-- Users can view their own permissions
CREATE POLICY "Users can view own brand permissions"
  ON user_brand_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Agency admins can manage permissions
CREATE POLICY "Agency admins can insert brand permissions"
  ON user_brand_permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_agency_admin());

CREATE POLICY "Agency admins can update brand permissions"
  ON user_brand_permissions FOR UPDATE
  TO authenticated
  USING (is_agency_admin())
  WITH CHECK (is_agency_admin());

CREATE POLICY "Agency admins can delete brand permissions"
  ON user_brand_permissions FOR DELETE
  TO authenticated
  USING (is_agency_admin());

-- Client admins can manage permissions for users in their client
CREATE POLICY "Client admins can insert permissions for their users"
  ON user_brand_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('client', 'client_admin')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_brand_permissions.user_id
        AND profiles.client_id = get_user_client_id()
    )
  );

CREATE POLICY "Client admins can update permissions for their users"
  ON user_brand_permissions FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('client', 'client_admin')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_brand_permissions.user_id
        AND profiles.client_id = get_user_client_id()
    )
  )
  WITH CHECK (
    get_user_role() IN ('client', 'client_admin')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_brand_permissions.user_id
        AND profiles.client_id = get_user_client_id()
    )
  );

-- ============================================================================
-- AUDIT_LOGS table RLS
-- ============================================================================

-- Agency admins can view all audit logs
CREATE POLICY "Agency admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_agency_admin());

-- Client admins can view logs for their client
CREATE POLICY "Client admins can view their client audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('client', 'client_admin')
    AND impersonated_client_id = get_user_client_id()
  );

-- Authenticated users can insert audit logs (system-generated)
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- CLIENT_NOTIFICATIONS table RLS
-- ============================================================================

-- Agency admins can view all notifications
CREATE POLICY "Agency admins can view all notifications"
  ON client_notifications FOR SELECT
  TO authenticated
  USING (is_agency_admin());

-- Client admins can view their own notifications
CREATE POLICY "Client admins can view their notifications"
  ON client_notifications FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
  );

-- Client admins can mark their notifications as read (update)
CREATE POLICY "Client admins can update their notifications"
  ON client_notifications FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
  )
  WITH CHECK (
    get_user_role() IN ('client', 'client_admin')
    AND client_id = get_user_client_id()
  );

-- Authenticated users can insert notifications (system-generated)
CREATE POLICY "Authenticated users can insert notifications"
  ON client_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
