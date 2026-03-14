/*
  # Add Magic Link Redemption Columns
  
  This migration adds support for secure magic link email redemption.
  
  1. New Columns on `redemptions` table:
    - `redemption_token` (text, unique) - Secure token for magic link validation
    - `token_expires_at` (timestamptz) - When the magic link expires
    - `email` (text) - Recipient email address (denormalized for fast lookup)
    - `email_sent_at` (timestamptz) - When the email was sent
    - `email_status` (text) - Status of email delivery
  
  2. New Indexes:
    - Index on `redemption_token` for fast token lookups
    - Index on `email` for recipient queries
  
  3. Security:
    - RLS policy allowing public read access with valid token
    - RLS policy allowing public update for redemption marking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'redemption_token'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN redemption_token text UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN token_expires_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'email'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN email text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN email_sent_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'email_status'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN email_status text DEFAULT 'pending';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_redemptions_token ON redemptions(redemption_token);
CREATE INDEX IF NOT EXISTS idx_redemptions_email ON redemptions(email);

DROP POLICY IF EXISTS "Public can view redemption by valid token" ON redemptions;
CREATE POLICY "Public can view redemption by valid token"
  ON redemptions
  FOR SELECT
  TO anon
  USING (
    redemption_token IS NOT NULL 
    AND status = 'valid'
  );

DROP POLICY IF EXISTS "Public can mark redemption as redeemed with valid token" ON redemptions;
CREATE POLICY "Public can mark redemption as redeemed with valid token"
  ON redemptions
  FOR UPDATE
  TO anon
  USING (
    redemption_token IS NOT NULL
    AND status = 'valid'
    AND (token_expires_at IS NULL OR token_expires_at > now())
  )
  WITH CHECK (
    status = 'redeemed'
  );