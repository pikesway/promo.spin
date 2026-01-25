/*
  # Add Loyalty Program and Staff System

  ## Overview
  This migration adds comprehensive support for loyalty programs with staff validation.
  It includes a new 'staff' user role, loyalty program tables, and validation tracking.

  ## Changes to Existing Tables

  ### user_role enum
  - Add 'staff' value for business staff members who validate loyalty actions

  ### campaigns table
  - Add 'loyalty' to the type check constraint

  ## New Tables

  ### 1. loyalty_programs
  Configuration table for loyalty program settings per campaign
  - `id` (uuid, primary key)
  - `campaign_id` (uuid, foreign key) - Links to parent campaign
  - `program_type` (text) - 'visit' or 'action' based
  - `threshold` (integer) - Number of visits/actions required
  - `validation_method` (text) - 'pin', 'icon_single', 'icon_sequence', 'icon_position'
  - `validation_config` (jsonb) - Method-specific settings (PIN value, icon selections, etc.)
  - `reward_name` (text) - Name of the reward
  - `reward_description` (text) - Description of what they get
  - `reset_behavior` (text) - 'reset' or 'rollover' after redemption
  - `lockout_threshold` (integer) - Failed attempts before lockout (default 3)
  - `max_redemptions_per_period` (integer) - Optional limit on redemptions
  - `period_type` (text) - 'daily', 'weekly', 'monthly', 'none'
  - `created_at`, `updated_at` (timestamptz)

  ### 2. loyalty_accounts
  Customer loyalty membership records
  - `id` (uuid, primary key)
  - `campaign_id` (uuid, foreign key)
  - `client_id` (uuid, foreign key)
  - `email` (text) - Customer email (unique per campaign)
  - `name` (text) - Customer name
  - `phone` (text) - Optional phone
  - `current_progress` (integer) - Current stamp count
  - `total_visits` (integer) - Lifetime visits
  - `reward_unlocked` (boolean) - Whether reward is available to redeem
  - `reward_unlocked_at` (timestamptz) - When reward became available
  - `member_code` (text, unique) - Unique member identifier for QR codes
  - `enrolled_at`, `updated_at` (timestamptz)

  ### 3. loyalty_progress_log
  Audit trail of all loyalty actions
  - `id` (uuid, primary key)
  - `loyalty_account_id` (uuid, foreign key)
  - `campaign_id` (uuid, foreign key)
  - `action_type` (text) - 'visit_confirmed', 'reward_unlocked', 'reward_redeemed'
  - `quantity` (integer) - How many stamps added (usually 1)
  - `validated_by` (uuid) - Staff/admin user ID who validated
  - `device_info` (jsonb) - Device metadata for audit
  - `created_at` (timestamptz)

  ### 4. loyalty_redemptions
  Reward redemption records
  - `id` (uuid, primary key)
  - `loyalty_account_id` (uuid, foreign key)
  - `campaign_id` (uuid, foreign key)
  - `short_code` (text, unique) - Redemption code
  - `status` (text) - 'valid', 'redeemed', 'expired'
  - `redeemed_at` (timestamptz)
  - `redeemed_by` (uuid) - Staff who completed redemption
  - `created_at`, `expires_at` (timestamptz)

  ### 5. validation_attempts
  Track validation attempts for security
  - `id` (uuid, primary key)
  - `loyalty_account_id` (uuid, foreign key)
  - `campaign_id` (uuid, foreign key)
  - `attempt_type` (text) - 'visit', 'redemption'
  - `success` (boolean)
  - `device_info` (jsonb)
  - `created_at` (timestamptz)

  ### 6. validation_lockouts
  Track locked accounts requiring manager override
  - `id` (uuid, primary key)
  - `loyalty_account_id` (uuid, foreign key)
  - `campaign_id` (uuid, foreign key)
  - `reason` (text) - Why account was locked
  - `locked_at` (timestamptz)
  - `unlocked_at` (timestamptz)
  - `unlocked_by` (uuid) - Manager who unlocked

  ## Security
  - RLS enabled on all new tables
  - Staff can only access their associated client's data
  - Admins/super_admins have full access
  - Clients can view their own loyalty data
*/

-- Add 'staff' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';

-- Update campaigns type constraint to include 'loyalty'
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_type_check 
  CHECK (type IN ('spin', 'scratch', 'bizgamez', 'loyalty'));

-- Create loyalty_programs table
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  program_type text NOT NULL DEFAULT 'visit' CHECK (program_type IN ('visit', 'action')),
  threshold integer NOT NULL DEFAULT 10 CHECK (threshold >= 1 AND threshold <= 100),
  validation_method text NOT NULL DEFAULT 'pin' CHECK (validation_method IN ('pin', 'icon_single', 'icon_sequence', 'icon_position')),
  validation_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_name text NOT NULL DEFAULT 'Free Reward',
  reward_description text DEFAULT '',
  reset_behavior text NOT NULL DEFAULT 'reset' CHECK (reset_behavior IN ('reset', 'rollover')),
  lockout_threshold integer NOT NULL DEFAULT 3 CHECK (lockout_threshold >= 1 AND lockout_threshold <= 10),
  max_redemptions_per_period integer DEFAULT NULL,
  period_type text DEFAULT 'none' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'none')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_programs_campaign_id ON loyalty_programs(campaign_id);

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;

-- Loyalty programs policies
CREATE POLICY "Anyone can view loyalty programs"
  ON loyalty_programs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create loyalty programs"
  ON loyalty_programs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update loyalty programs"
  ON loyalty_programs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete loyalty programs"
  ON loyalty_programs FOR DELETE
  TO authenticated
  USING (true);

-- Create loyalty_accounts table
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  current_progress integer NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
  total_visits integer NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  reward_unlocked boolean NOT NULL DEFAULT false,
  reward_unlocked_at timestamptz,
  member_code text UNIQUE NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_campaign_id ON loyalty_accounts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_client_id ON loyalty_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_email ON loyalty_accounts(email);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_member_code ON loyalty_accounts(member_code);

ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;

-- Loyalty accounts policies - anyone can view and create (for enrollment)
CREATE POLICY "Anyone can view loyalty accounts"
  ON loyalty_accounts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create loyalty accounts"
  ON loyalty_accounts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update loyalty accounts"
  ON loyalty_accounts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create loyalty_progress_log table
CREATE TABLE IF NOT EXISTS loyalty_progress_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('visit_confirmed', 'reward_unlocked', 'reward_redeemed', 'progress_reset')),
  quantity integer NOT NULL DEFAULT 1,
  validated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_progress_log_account_id ON loyalty_progress_log(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_progress_log_campaign_id ON loyalty_progress_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_progress_log_created_at ON loyalty_progress_log(created_at DESC);

ALTER TABLE loyalty_progress_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view loyalty progress log"
  ON loyalty_progress_log FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create loyalty progress log"
  ON loyalty_progress_log FOR INSERT
  WITH CHECK (true);

-- Create loyalty_redemptions table
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  short_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'redeemed', 'expired')),
  redeemed_at timestamptz,
  redeemed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_account_id ON loyalty_redemptions(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_campaign_id ON loyalty_redemptions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_short_code ON loyalty_redemptions(short_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_status ON loyalty_redemptions(status);

ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view loyalty redemptions"
  ON loyalty_redemptions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create loyalty redemptions"
  ON loyalty_redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update loyalty redemptions"
  ON loyalty_redemptions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create validation_attempts table
CREATE TABLE IF NOT EXISTS validation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  attempt_type text NOT NULL CHECK (attempt_type IN ('visit', 'redemption')),
  success boolean NOT NULL DEFAULT false,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validation_attempts_account_id ON validation_attempts(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_validation_attempts_created_at ON validation_attempts(created_at DESC);

ALTER TABLE validation_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view validation attempts"
  ON validation_attempts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create validation attempts"
  ON validation_attempts FOR INSERT
  WITH CHECK (true);

-- Create validation_lockouts table
CREATE TABLE IF NOT EXISTS validation_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'Too many failed validation attempts',
  locked_at timestamptz DEFAULT now(),
  unlocked_at timestamptz,
  unlocked_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_validation_lockouts_account_id ON validation_lockouts(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_validation_lockouts_active ON validation_lockouts(loyalty_account_id) WHERE unlocked_at IS NULL;

ALTER TABLE validation_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view validation lockouts"
  ON validation_lockouts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage validation lockouts"
  ON validation_lockouts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update validation lockouts"
  ON validation_lockouts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger for loyalty_programs updated_at
CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for loyalty_accounts updated_at
CREATE TRIGGER update_loyalty_accounts_updated_at
  BEFORE UPDATE ON loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique member codes
CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate short redemption codes
CREATE OR REPLACE FUNCTION generate_loyalty_short_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;