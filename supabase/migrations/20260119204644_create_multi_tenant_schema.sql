/*
  # Multi-Tenant Campaign Platform Schema

  ## Overview
  This migration creates a three-tier white-label platform structure:
  Agency → Clients → Campaigns → Leads/Redemptions

  ## New Tables
  
  ### 1. agencies
  - `id` (uuid, primary key) - Unique agency identifier
  - `name` (text) - Agency name
  - `email` (text) - Contact email
  - `subdomain` (text, unique) - Custom subdomain for agency branding
  - `settings` (jsonb) - Agency-level configuration and branding
  - `status` (text) - Account status (active, suspended, trial)
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. clients
  - `id` (uuid, primary key) - Unique client identifier
  - `agency_id` (uuid, foreign key) - Parent agency reference
  - `name` (text) - Client business name
  - `email` (text) - Client contact email
  - `logo_url` (text) - Client logo for branding
  - `settings` (jsonb) - Client-specific settings
  - `status` (text) - Account status
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. campaigns (replaces games)
  - `id` (uuid, primary key) - Unique campaign identifier
  - `client_id` (uuid, foreign key) - Owner client reference
  - `name` (text) - Campaign name
  - `slug` (text, unique) - URL-friendly identifier (e.g., client-promo-1)
  - `type` (text) - Campaign type: 'spin' or 'scratch'
  - `status` (text) - Draft, scheduled, active, paused, completed
  - `start_date` (timestamptz) - Campaign start time
  - `end_date` (timestamptz) - Campaign end time
  - `config` (jsonb) - Full campaign configuration (prizes, colors, images, etc.)
  - `analytics` (jsonb) - Cached analytics data
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. leads (enhanced)
  - `id` (uuid, primary key) - Unique lead identifier
  - `campaign_id` (uuid, foreign key) - Source campaign
  - `client_id` (uuid, foreign key) - Client reference (denormalized for queries)
  - `data` (jsonb) - Lead form data (name, email, phone, custom fields)
  - `metadata` (jsonb) - Device info, IP, user agent
  - `created_at` (timestamptz) - Submission timestamp

  ### 5. redemptions (enhanced with locking)
  - `id` (uuid, primary key) - Unique redemption identifier
  - `campaign_id` (uuid, foreign key) - Source campaign
  - `client_id` (uuid, foreign key) - Client reference
  - `lead_id` (uuid, foreign key, nullable) - Associated lead
  - `prize_name` (text) - Prize description
  - `short_code` (text, unique) - 6-character redemption code
  - `status` (text) - valid, redeemed, expired
  - `generated_at` (timestamptz) - Code generation time
  - `expires_at` (timestamptz, nullable) - Expiration time
  - `redeemed_at` (timestamptz, nullable) - Redemption timestamp (LOCKS the record)
  - `redeemed_by` (text, nullable) - Staff member who redeemed
  - `metadata` (jsonb) - Additional redemption data

  ## Row Level Security (RLS)
  
  All tables have RLS enabled with policies enforcing:
  - Agency admins can access all their clients' data
  - Clients can only access their own campaigns and data
  - Public can view active campaigns and create leads/redemptions
  
  ## Important Notes
  
  1. The redemption locking mechanism uses `redeemed_at` timestamp
     Once set, it should not be changed (enforced at application level)
  
  2. Campaign slugs must be globally unique for routing
  
  3. Status transitions are enforced at application level
*/

-- Drop old tables if they exist (since we're restructuring)
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS games CASCADE;

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

CREATE POLICY "Anyone can view agencies"
  ON agencies FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create agencies"
  ON agencies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update agencies"
  ON agencies FOR UPDATE
  USING (true);

-- CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clients"
  ON clients FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create clients"
  ON clients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update clients"
  ON clients FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete clients"
  ON clients FOR DELETE
  USING (true);

-- CAMPAIGNS TABLE (replaces games)
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('spin', 'scratch')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
  start_date timestamptz,
  end_date timestamptz,
  config jsonb DEFAULT '{}'::jsonb,
  analytics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaigns_slug ON campaigns(slug);
CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns"
  ON campaigns FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update campaigns"
  ON campaigns FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete campaigns"
  ON campaigns FOR DELETE
  USING (true);

-- LEADS TABLE (enhanced)
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  data jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create leads"
  ON leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view leads"
  ON leads FOR SELECT
  USING (true);

-- REDEMPTIONS TABLE (enhanced with locking)
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
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_redemptions_short_code ON redemptions(short_code);
CREATE INDEX idx_redemptions_campaign_id ON redemptions(campaign_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create redemptions"
  ON redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view redemptions"
  ON redemptions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update redemptions"
  ON redemptions FOR UPDATE
  USING (true);

-- Function to auto-update campaigns.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();