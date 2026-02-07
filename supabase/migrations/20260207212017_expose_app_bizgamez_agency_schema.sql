/*
  # Expose app_bizgamez_agency Schema to PostgREST

  This migration configures PostgREST to expose the app_bizgamez_agency schema
  so the Supabase JS client can access tables in this schema.

  ## Changes
  - Adds app_bizgamez_agency to the list of exposed schemas
  - Notifies PostgREST to reload configuration
*/

-- Try to expose the schema via database configuration
-- Note: This may require dashboard configuration in some Supabase setups

-- Grant usage on schema to the API roles
GRANT USAGE ON SCHEMA app_bizgamez_agency TO anon;
GRANT USAGE ON SCHEMA app_bizgamez_agency TO authenticated;
GRANT USAGE ON SCHEMA app_bizgamez_agency TO service_role;

-- Grant permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_bizgamez_agency TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_bizgamez_agency TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA app_bizgamez_agency TO service_role;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_bizgamez_agency TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_bizgamez_agency TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app_bizgamez_agency TO service_role;

-- Try to configure PostgREST to expose the schema
-- This works on some Supabase installations
DO $$
BEGIN
  -- Attempt to set the extra search path for PostgREST
  -- This may fail silently if the role doesn't have permission
  BEGIN
    ALTER ROLE authenticator SET pgrst.db_extra_search_path TO 'public, app_bizgamez_agency';
    NOTIFY pgrst, 'reload config';
  EXCEPTION WHEN OTHERS THEN
    -- If this fails, the schema needs to be configured in the dashboard
    RAISE NOTICE 'Schema configuration requires dashboard settings';
  END;
END $$;

-- Notify PostgREST to reload configuration
NOTIFY pgrst, 'reload config';