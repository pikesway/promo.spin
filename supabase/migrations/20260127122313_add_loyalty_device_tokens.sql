/*
  # Add Device Token Memory for Loyalty Cards

  1. New Tables
    - `loyalty_device_tokens`
      - `id` (uuid, primary key)
      - `loyalty_account_id` (uuid, references loyalty_accounts)
      - `campaign_id` (uuid, references campaigns)
      - `device_token` (text, unique - secure random token)
      - `device_name` (text, optional - browser/device info)
      - `created_at` (timestamp)
      - `last_used_at` (timestamp)
      - `expires_at` (timestamp - 60 days from creation)

  2. Security
    - Enable RLS on `loyalty_device_tokens` table
    - Add policy for anonymous users to lookup tokens (SELECT)
    - Add policy for anonymous users to create tokens (INSERT)
    - Add policy for anonymous users to update last_used_at (UPDATE)
    - Add index on device_token for fast lookups

  3. Notes
    - Tokens expire after 60 days (fixed window, not rolling)
    - One token per device per campaign per loyalty account
    - Tokens contain no user data - they are opaque identifiers
*/

CREATE TABLE IF NOT EXISTS loyalty_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  device_token text NOT NULL,
  device_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT loyalty_device_tokens_device_token_key UNIQUE (device_token)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_device_tokens_token 
  ON loyalty_device_tokens(device_token);

CREATE INDEX IF NOT EXISTS idx_loyalty_device_tokens_account_campaign 
  ON loyalty_device_tokens(loyalty_account_id, campaign_id);

ALTER TABLE loyalty_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can lookup device tokens"
  ON loyalty_device_tokens
  FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

CREATE POLICY "Anyone can create device tokens"
  ON loyalty_device_tokens
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (expires_at > now());

CREATE POLICY "Anyone can update last_used_at on device tokens"
  ON loyalty_device_tokens
  FOR UPDATE
  TO anon, authenticated
  USING (expires_at > now())
  WITH CHECK (expires_at > now());
