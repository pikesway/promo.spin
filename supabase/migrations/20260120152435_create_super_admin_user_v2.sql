/*
  # Create Super Admin User

  ## Overview
  This migration creates the initial super admin user account.

  ## User Details
  - Email: pikesway@gmail.com
  - Password: demo123
  - Role: super_admin
  - Name: Super Admin

  ## Security
  This is a one-time setup migration for the initial admin account.
*/

-- Insert user into auth.users with encrypted password
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Generate a new user ID
  user_id := gen_random_uuid();

  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    user_id,
    '00000000-0000-0000-0000-000000000000',
    'pikesway@gmail.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Super Admin","role":"super_admin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    user_id::text,
    user_id,
    format('{"sub":"%s","email":"%s"}', user_id::text, 'pikesway@gmail.com')::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- The trigger will automatically create the profile
  -- But let's ensure it's a super_admin
  UPDATE profiles 
  SET role = 'super_admin', full_name = 'Super Admin'
  WHERE id = user_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'User already exists';
END $$;
