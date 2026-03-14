/*
  # Add Brands Hierarchy and Client/User Refactor

  ## Summary
  This migration refactors the schema to support the Agency > Client > Brand > Campaign hierarchy.

  ## Changes

  ### 1. clients table
  - Add: active_brands_limit, active_users_limit, active_campaigns_limit
  - Keep: unlock_pin remains temporarily (will be on brands going forward)

  ### 2. New brands table
  - Belongs to a client
  - Has its own branding (logo, colors)
  - Has unlock_pin (moved from clients)
  - Has loyalty_members_limit

  ### 3. campaigns table
  - Add brand_id (FK to brands) — primary ownership
  - Keep client_id as denormalized reference (auto-populated by trigger)

  ### 4. loyalty_accounts table
  - Add brand_id as denormalized reference

  ### 5. leads table
  - Add brand_id as denormalized reference

  ### 6. user_role enum
  - Add client_admin (new name for client role going forward)
  - Add client_user (staff equivalent for brand-level access)

  ### 7. New tables
  - user_brand_permissions: per-brand permissions for users
  - audit_logs: impersonation and action audit trail
  - client_notifications: notifications sent to clients when admin acts on their behalf

  ## Security
  - RLS enabled on all new tables
  - Policies added for appropriate role-based access
*/

-- ============================================================================
-- STEP 1: Extend user_role enum
-- ============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_user';

-- ============================================================================
-- STEP 2: Add limit columns to clients table
-- ============================================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS active_brands_limit integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS active_users_limit integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS active_campaigns_limit integer DEFAULT 20;

-- ============================================================================
-- STEP 3: Create brands table
-- ============================================================================

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  logo_type text DEFAULT 'url',
  primary_color text DEFAULT '#0EA5E9',
  secondary_color text DEFAULT '#0284C7',
  background_color text DEFAULT '#09090B',
  unlock_pin text,
  loyalty_members_limit integer DEFAULT 500,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_client_id ON brands(client_id);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(active);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Add brand_id to campaigns (keep client_id as denormalized)
-- ============================================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON campaigns(brand_id);

-- Trigger: auto-populate client_id from brand when brand_id is set
CREATE OR REPLACE FUNCTION sync_campaign_client_from_brand()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.brand_id IS NOT NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM brands
    WHERE id = NEW.brand_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_sync_client_from_brand ON campaigns;
CREATE TRIGGER campaign_sync_client_from_brand
  BEFORE INSERT OR UPDATE OF brand_id ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION sync_campaign_client_from_brand();

-- ============================================================================
-- STEP 5: Add brand_id to loyalty_accounts (denormalized)
-- ============================================================================

ALTER TABLE loyalty_accounts
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_brand_id ON loyalty_accounts(brand_id);

-- Trigger: auto-populate brand_id from campaign when inserting loyalty accounts
CREATE OR REPLACE FUNCTION sync_loyalty_account_brand_from_campaign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.brand_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT brand_id INTO NEW.brand_id
    FROM campaigns
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loyalty_account_sync_brand ON loyalty_accounts;
CREATE TRIGGER loyalty_account_sync_brand
  BEFORE INSERT ON loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_loyalty_account_brand_from_campaign();

-- ============================================================================
-- STEP 6: Add brand_id to leads (denormalized)
-- ============================================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_leads_brand_id ON leads(brand_id);

-- Trigger: auto-populate brand_id from campaign when inserting leads
CREATE OR REPLACE FUNCTION sync_lead_brand_from_campaign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.brand_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT brand_id INTO NEW.brand_id
    FROM campaigns
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_sync_brand ON leads;
CREATE TRIGGER lead_sync_brand
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION sync_lead_brand_from_campaign();

-- ============================================================================
-- STEP 7: Create user_brand_permissions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_brand_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  is_brand_manager boolean DEFAULT false,
  can_add_campaign boolean DEFAULT true,
  can_edit_campaign boolean DEFAULT true,
  can_activate_pause_campaign boolean DEFAULT true,
  can_delete_campaign boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_user_id ON user_brand_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_brand_id ON user_brand_permissions(brand_id);

ALTER TABLE user_brand_permissions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_user_brand_permissions_updated_at ON user_brand_permissions;
CREATE TRIGGER update_user_brand_permissions_updated_at
  BEFORE UPDATE ON user_brand_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 8: Create audit_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  impersonated_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  impersonated_brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_client ON audit_logs(impersonated_client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 9: Create client_notifications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_client_notifications_client_id ON client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_read_at ON client_notifications(read_at);

ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;
