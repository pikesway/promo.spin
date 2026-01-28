/*
  # Add User Theme Preference

  1. Changes
    - Add `theme_preference` column to `profiles` table
    - Stores user's preferred theme: 'light', 'dark', or 'system'
    - Defaults to 'system' to respect OS preference on first visit

  2. Column Details
    - `theme_preference` (text): User's theme choice
      - 'light': Always use light mode
      - 'dark': Always use dark mode  
      - 'system': Follow OS/browser preference (default)

  3. Security
    - Existing RLS policies on profiles table already handle access control
    - Users can only update their own profile theme preference
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN theme_preference text DEFAULT 'system';
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.theme_preference IS 'User theme preference: light, dark, or system';