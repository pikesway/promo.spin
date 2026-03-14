/*
  # Clear Non-Admin Data

  ## Summary
  Removes all non-admin data to prepare for the new hierarchy seed data.
  The super admin account (pikesway@gmail.com) is preserved.
  All other profiles, clients, campaigns, loyalty data, leads, and redemptions are removed.

  ## Preserved
  - Super admin profile (role = 'super_admin' or 'admin')
  - Auth users for super admin

  ## Removed
  - All clients and dependent data
  - All campaigns and dependent data
  - All loyalty data
  - All leads and redemptions
  - All non-admin profiles
*/

-- Clear dependent tables first (respect FK order)
DELETE FROM loyalty_device_tokens;
DELETE FROM validation_attempts;
DELETE FROM validation_lockouts;
DELETE FROM loyalty_progress_log;
DELETE FROM loyalty_redemptions;
DELETE FROM loyalty_accounts;
DELETE FROM loyalty_programs;
DELETE FROM game_plays;
DELETE FROM prize_inventory;
DELETE FROM redemptions;
DELETE FROM leads;
DELETE FROM campaigns;
DELETE FROM user_brand_permissions;
DELETE FROM brands;
DELETE FROM client_notifications;
DELETE FROM audit_logs;
DELETE FROM webhook_events;

-- Remove non-admin profiles (will cascade to auth issues, so just update client_id)
DELETE FROM profiles WHERE role NOT IN ('admin', 'super_admin');

-- Remove clients (after profiles cleared)
DELETE FROM clients;
DELETE FROM agencies;
