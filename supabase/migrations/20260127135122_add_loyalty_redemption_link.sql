/*
  # Link Loyalty Redemptions to Main Redemptions Table

  ## Purpose
  This migration adds a foreign key relationship between loyalty_redemptions and
  redemptions tables to enable loyalty program prizes to use the same redemption
  flow as spin games (including email delivery and coupon display).

  ## Changes
  1. Add `redemption_id` column to `loyalty_redemptions` table
     - Foreign key reference to `redemptions.id`
     - Nullable to maintain backward compatibility with existing records
     - ON DELETE SET NULL to prevent cascade issues

  2. Add index for efficient lookups by redemption_id

  ## Notes
  - Existing loyalty_redemptions records will have NULL redemption_id
  - New redemptions will populate this field to link to the main redemptions table
  - This allows querying redemption details (status, redeemed_at) from either table
*/

-- Add redemption_id column to loyalty_redemptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_redemptions' AND column_name = 'redemption_id'
  ) THEN
    ALTER TABLE loyalty_redemptions 
    ADD COLUMN redemption_id uuid REFERENCES redemptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_redemption_id 
ON loyalty_redemptions(redemption_id) 
WHERE redemption_id IS NOT NULL;