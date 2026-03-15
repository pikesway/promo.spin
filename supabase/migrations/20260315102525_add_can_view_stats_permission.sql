/*
  # Add can_view_stats permission to user_brand_permissions

  ## Summary
  Adds a new boolean column `can_view_stats` to the `user_brand_permissions` table.

  ## Changes
  - `user_brand_permissions` table:
    - New column: `can_view_stats` (boolean, DEFAULT false)
      - When true: user sees stats cards (Today confirmations, Pending Rewards, Active Members)
        on both StaffDashboard and ClientDashboard
      - When false: user sees only their actionable content (member list, campaigns they can manage)
        without aggregate statistics

  ## Notes
  - Defaults to false so existing users are unaffected until explicitly granted
  - Existing rows are updated to false (safe default — no data loss)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_brand_permissions' AND column_name = 'can_view_stats'
  ) THEN
    ALTER TABLE user_brand_permissions ADD COLUMN can_view_stats boolean NOT NULL DEFAULT false;
  END IF;
END $$;
