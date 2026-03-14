/*
  # Initialize BizGamez Agency Database Schema

  1. Core Tables
    - agencies: Agency management
    - clients: Client management with branding
    - campaigns: Campaign management
    - leads: Lead tracking
    - redemptions: Redemption management
  
  2. Game Tables
    - prize_inventory: Prize tracking
    - game_plays: Game play history
  
  3. User Tables
    - profiles: User profiles with roles (super_admin, admin, client, staff)
  
  4. Webhook & Loyalty Tables
    - webhook_events: BizGamez webhook events
    - loyalty_programs: Loyalty program configuration
    - loyalty_accounts: Member accounts
    - loyalty_progress_log: Activity tracking
    - loyalty_redemptions: Loyalty redemptions
    - validation_attempts: Failed validation tracking
    - validation_lockouts: Account lockouts
    - loyalty_device_tokens: Device token management
  
  5. Security
    - Enable RLS on all tables
    - Add permissive policies for initial setup
    - Add indexes for performance
*/

-- ============================================================================
-- PART 1: CORE TABLES
-- ============================================================================

-- AGENCIES TABLE
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subdomain text UNIQUE,
  settings jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agencies" ON agencies FOR SELECT USING (true);
CREATE POLICY "Anyone can create agencies" ON agencies FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update agencies" ON agencies FOR UPDATE USING (true);

-- CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('prospect', 'active', 'idle', 'paused', 'churned')),
  created_at timestamptz DEFAULT now(),
  logo_type text DEFAULT 'url',
  primary_color text DEFAULT '#6366F1',
  secondary_color text DEFAULT '#8B5CF6',
  background_color text DEFAULT '#09090B',
  status_notes text,
  status_updated_at timestamptz DEFAULT now(),
  unlock_pin text
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Anyone can create clients" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update clients" ON clients FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete clients" ON clients FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON clients(agency_id);

-- CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('spin', 'scratch', 'bizgamez', 'loyalty')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
  start_date timestamptz,
  end_date timestamptz,
  config jsonb DEFAULT '{}'::jsonb,
  analytics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns" ON campaigns FOR SELECT USING (true);
CREATE POLICY "Anyone can create campaigns" ON campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update campaigns" ON campaigns FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete campaigns" ON campaigns FOR DELETE USING (true);

-- LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  data jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view leads" ON leads FOR SELECT USING (true);

-- REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  prize_name text NOT NULL,
  short_code text UNIQUE NOT NULL,
  status text DEFAULT 'valid' CHECK (status IN ('valid', 'redeemed', 'expired')),
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by text,
  metadata jsonb DEFAULT '{}'::jsonb,
  redemption_token text UNIQUE,
  token_expires_at timestamptz,
  email text,
  email_sent_at timestamptz,
  email_status text DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_redemptions_short_code ON redemptions(short_code);
CREATE INDEX IF NOT EXISTS idx_redemptions_campaign_id ON redemptions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);
CREATE INDEX IF NOT EXISTS idx_redemptions_client_id ON redemptions(client_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_lead_id ON redemptions(lead_id);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create redemptions" ON redemptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view redemptions" ON redemptions FOR SELECT USING (true);
CREATE POLICY "Anyone can update redemptions" ON redemptions FOR UPDATE USING (true);

-- ============================================================================
-- PART 2: PRIZE INVENTORY AND GAME PLAYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS prize_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  prize_name text NOT NULL,
  initial_quantity integer NOT NULL DEFAULT 0 CHECK (initial_quantity >= 0),
  remaining_quantity integer NOT NULL DEFAULT 0 CHECK (remaining_quantity >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, prize_name)
);

ALTER TABLE prize_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prize inventory" ON prize_inventory FOR SELECT USING (true);
CREATE POLICY "Anyone can insert prize inventory" ON prize_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prize inventory" ON prize_inventory FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete prize inventory" ON prize_inventory FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text NOT NULL,
  outcome_prize_name text,
  is_win boolean NOT NULL DEFAULT false,
  played_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game plays" ON game_plays FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game plays" ON game_plays FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 3: USER PROFILES AND AUTHENTICATION
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'client', 'staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role user_role NOT NULL DEFAULT 'client',
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  theme_preference text DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));

-- ============================================================================
-- PART 4: WEBHOOK EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  game_code text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  name text,
  email text,
  mobile text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_campaign_id ON webhook_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_game_code ON webhook_events(game_code);
CREATE INDEX IF NOT EXISTS idx_webhook_events_client_id ON webhook_events(client_id);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view webhook events" ON webhook_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert webhook events" ON webhook_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update webhook events" ON webhook_events FOR UPDATE USING (true);

-- ============================================================================
-- PART 5: LOYALTY PROGRAM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS loyalty_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
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
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_programs_campaign_id ON loyalty_programs(campaign_id);

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view loyalty programs" ON loyalty_programs FOR SELECT USING (true);
CREATE POLICY "Anyone can create loyalty programs" ON loyalty_programs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update loyalty programs" ON loyalty_programs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete loyalty programs" ON loyalty_programs FOR DELETE USING (true);

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

CREATE POLICY "Anyone can view loyalty accounts" ON loyalty_accounts FOR SELECT USING (true);
CREATE POLICY "Anyone can create loyalty accounts" ON loyalty_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update loyalty accounts" ON loyalty_accounts FOR UPDATE USING (true);

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

CREATE POLICY "Anyone can view loyalty progress log" ON loyalty_progress_log FOR SELECT USING (true);
CREATE POLICY "Anyone can create loyalty progress log" ON loyalty_progress_log FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  short_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'redeemed', 'expired')),
  redeemed_at timestamptz,
  redeemed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  redemption_id uuid REFERENCES redemptions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_account_id ON loyalty_redemptions(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_campaign_id ON loyalty_redemptions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_short_code ON loyalty_redemptions(short_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_status ON loyalty_redemptions(status);

ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view loyalty redemptions" ON loyalty_redemptions FOR SELECT USING (true);
CREATE POLICY "Anyone can create loyalty redemptions" ON loyalty_redemptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update loyalty redemptions" ON loyalty_redemptions FOR UPDATE USING (true);

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

CREATE POLICY "Anyone can view validation attempts" ON validation_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can create validation attempts" ON validation_attempts FOR INSERT WITH CHECK (true);

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

ALTER TABLE validation_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view validation lockouts" ON validation_lockouts FOR SELECT USING (true);
CREATE POLICY "Anyone can manage validation lockouts" ON validation_lockouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update validation lockouts" ON validation_lockouts FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS loyalty_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  device_token text UNIQUE NOT NULL,
  device_name text DEFAULT '',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_device_tokens_account_id ON loyalty_device_tokens(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_device_tokens_token ON loyalty_device_tokens(device_token);

ALTER TABLE loyalty_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view device tokens" ON loyalty_device_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can create device tokens" ON loyalty_device_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update device tokens" ON loyalty_device_tokens FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete device tokens" ON loyalty_device_tokens FOR DELETE USING (true);

-- ============================================================================
-- PART 6: HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_client_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================================================
-- PART 7: TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_client_status_timestamp ON clients;
CREATE TRIGGER trigger_update_client_status_timestamp
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_client_status_timestamp();

DROP TRIGGER IF EXISTS update_loyalty_programs_updated_at ON loyalty_programs;
CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loyalty_accounts_updated_at ON loyalty_accounts;
CREATE TRIGGER update_loyalty_accounts_updated_at
  BEFORE UPDATE ON loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();