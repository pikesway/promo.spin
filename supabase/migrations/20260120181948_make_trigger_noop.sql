/*
  # Make User Trigger a No-Op

  ## Overview
  Makes the handle_new_user trigger do nothing so we can test if it's the cause.
  Profile creation will be fully handled by the edge function.

  ## Changes
  1. Replaces trigger function with empty implementation
  2. Edge function will handle all profile creation

  ## Important Notes
  - This isolates the trigger as the potential cause
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Do nothing - let edge function handle profile creation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;