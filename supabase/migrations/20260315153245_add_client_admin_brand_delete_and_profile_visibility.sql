/*
  # RLS: Add client_admin delete brand policy and profile visibility

  ## Summary
  Adds missing RLS policies for client_admin self-service:

  1. brands DELETE — allow client_admin to delete their own client's brands
  2. profiles SELECT — allow client_admin to see all users in their own client
  3. profiles UPDATE — allow client_admin to update (activate/deactivate) users in their client
  4. user_brand_permissions DELETE — allow client_admin to delete permissions for their users

  ## Security
  All policies are scoped to the caller's own client_id via get_user_client_id().
  A client_admin cannot affect another client's data.
*/

-- ============================================================================
-- brands: allow client_admin to delete their own brands
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'brands'
      AND policyname = 'Client admins can delete their client brands'
  ) THEN
    CREATE POLICY "Client admins can delete their client brands"
      ON brands FOR DELETE
      TO authenticated
      USING (
        get_user_role() IN ('client', 'client_admin')
        AND client_id = get_user_client_id()
      );
  END IF;
END $$;

-- ============================================================================
-- profiles: client_admin can view all users in their client
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Client admins can view users in their client'
  ) THEN
    CREATE POLICY "Client admins can view users in their client"
      ON profiles FOR SELECT
      TO authenticated
      USING (
        get_user_role() IN ('client', 'client_admin')
        AND client_id = get_user_client_id()
      );
  END IF;
END $$;

-- ============================================================================
-- profiles: client_admin can update (activate/deactivate) users in their client
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Client admins can update users in their client'
  ) THEN
    CREATE POLICY "Client admins can update users in their client"
      ON profiles FOR UPDATE
      TO authenticated
      USING (
        get_user_role() IN ('client', 'client_admin')
        AND client_id = get_user_client_id()
        AND id != auth.uid()
      )
      WITH CHECK (
        get_user_role() IN ('client', 'client_admin')
        AND client_id = get_user_client_id()
        AND id != auth.uid()
      );
  END IF;
END $$;

-- ============================================================================
-- user_brand_permissions: client_admin can delete permissions for their users
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_brand_permissions'
      AND policyname = 'Client admins can delete permissions for their users'
  ) THEN
    CREATE POLICY "Client admins can delete permissions for their users"
      ON user_brand_permissions FOR DELETE
      TO authenticated
      USING (
        get_user_role() IN ('client', 'client_admin')
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = user_brand_permissions.user_id
            AND profiles.client_id = get_user_client_id()
        )
      );
  END IF;
END $$;
