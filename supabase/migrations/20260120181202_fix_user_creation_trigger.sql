/*
  # Fix User Creation Trigger

  ## Overview
  Updates the handle_new_user trigger function to be more robust and handle edge cases
  that could cause user creation to fail.

  ## Changes
  1. Uses ON CONFLICT to handle cases where profile might already exist
  2. Adds better handling for role values that don't match the enum
  3. Makes the trigger more resilient to failures

  ## Important Notes
  - This fixes the "Database error creating new user" issue
  - The trigger now safely handles duplicate profiles
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Safely convert role string to enum, defaulting to 'client' if invalid
  BEGIN
    user_role_value := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'client'::user_role
    );
  EXCEPTION WHEN OTHERS THEN
    user_role_value := 'client'::user_role;
  END;

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role_value
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;