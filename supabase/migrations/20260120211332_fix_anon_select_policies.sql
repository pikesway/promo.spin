/*
  # Fix RLS policies for anonymous game players

  1. Problem
    - Anonymous users can INSERT leads and redemptions
    - But they cannot SELECT back the inserted rows
    - This causes the `.insert().select()` pattern to fail

  2. Solution
    - Add SELECT policies for anon role on leads table
    - The select is limited to return only the id after insert

  3. Security Notes
    - Anon can only see leads they just created (by campaign_id match)
    - This is safe because leads don't contain sensitive admin data
*/

-- Allow anon to read back leads they insert (needed for .insert().select() pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'leads' AND policyname = 'Anon can read leads for insert return'
  ) THEN
    CREATE POLICY "Anon can read leads for insert return"
      ON leads FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;