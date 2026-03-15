/*
  # Fix is_admin_or_super_admin() JWT role check

  ## Problem
  The function was reading `auth.jwt()->>'role'` which returns 'authenticated'
  (Supabase's built-in JWT role), not the application role stored in app_metadata.
  This caused the RLS policy to always fall through to the profiles table fallback,
  which itself requires the RLS policy to pass — creating a circular dependency.

  ## Fix
  Check `auth.jwt()->'app_metadata'->>'role'` for the application role first,
  then fall back to the profiles table (which works because the function is
  SECURITY DEFINER and bypasses RLS).
*/

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := (auth.jwt()->'app_metadata'->>'role')::text;

  IF user_role IS NOT NULL THEN
    RETURN user_role IN ('admin', 'super_admin');
  END IF;

  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(user_role IN ('admin', 'super_admin'), false);
END;
$$;
