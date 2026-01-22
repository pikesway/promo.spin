/*
  # Fix Client Update Trigger

  1. Problem
    - Trigger `update_updated_at` tries to set `updated_at` field that doesn't exist
    - Trigger `update_client_status_timestamp` tries to set `activated_at` and `deactivated_at` fields that don't exist
    
  2. Solution
    - Drop the problematic triggers
    - The clients table already has `created_at` and `status_updated_at` fields which are sufficient
    
  3. Security
    - No RLS changes needed
*/

-- Drop the problematic triggers if they exist
DROP TRIGGER IF EXISTS update_updated_at ON clients;
DROP TRIGGER IF EXISTS update_client_status_timestamp ON clients;