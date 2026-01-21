/*
  # Fix User Creation Trigger - Bypass RLS

  ## Overview
  Updates the handle_new_user trigger to explicitly bypass RLS and use
  a simpler, more defensive approach that won't fail the transaction.

  ## Changes
  1. Uses SET LOCAL to bypass RLS within the trigger
  2. Simplified exception handling
  3. Uses a separate savepoint approach to prevent transaction rollback

  ## Important Notes
  - This should fix the "Database error creating new user" issue
  - The trigger now explicitly sets row_level_security off for its operations
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Bypass RLS for this function
  PERFORM set_config('row_security', 'off', true);
  
  -- Simple insert with defaults, using ON CONFLICT to handle any edge cases
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'client'::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never fail - just return NEW and let the edge function handle profile creation
  RAISE LOG 'handle_new_user trigger warning: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;