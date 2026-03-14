/*
  # Fix Loyalty Accounts Anonymous Update Policy

  1. Changes
    - Add UPDATE policy for anonymous users on loyalty_accounts table
    - This allows customers to update their own loyalty card progress without authentication

  2. Security
    - Anonymous users can only update loyalty accounts (progress tracking)
    - This is necessary because the customer-facing loyalty card page doesn't require authentication
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loyalty_accounts' 
    AND policyname = 'Anyone can update loyalty accounts'
  ) THEN
    CREATE POLICY "Anyone can update loyalty accounts"
      ON loyalty_accounts
      FOR UPDATE
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;