/*
  # Add Client Unlock PIN

  1. Changes
    - Adds `unlock_pin` column to `clients` table
    - This PIN is used by staff to unlock customer loyalty accounts that have been locked due to failed validation attempts
    - PIN should be a 4-6 digit numeric code

  2. Security
    - PIN is stored as text to preserve leading zeros
    - Only authenticated users with proper access to clients table can read/update this field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'unlock_pin'
  ) THEN
    ALTER TABLE clients ADD COLUMN unlock_pin text;
  END IF;
END $$;

COMMENT ON COLUMN clients.unlock_pin IS 'PIN code (4-6 digits) used by staff to unlock customer loyalty accounts';