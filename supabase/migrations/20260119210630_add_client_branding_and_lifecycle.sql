/*
  # Client Branding & Lifecycle Status Enhancement

  ## Overview
  Adds comprehensive client branding fields and lifecycle status management to the clients table.

  ## Changes Made

  ### New Columns Added to `clients` table:
  
  1. **Logo Management**
     - `logo_type` (text) - Specifies whether logo is "upload" (Supabase Storage) or "url" (external URL)
     - Default: 'url'
  
  2. **Brand Colors**
     - `primary_color` (text) - Main brand color for buttons, wheel segments
     - Default: '#6366F1' (indigo)
     - `secondary_color` (text) - Secondary brand color for accents
     - Default: '#8B5CF6' (purple)
     - `background_color` (text) - Optional background color for campaigns
     - Default: '#09090B' (near black)
  
  3. **Lifecycle Status Management**
     - `status` (text with constraint) - Client lifecycle stage
     - Allowed values: 'prospect', 'active', 'idle', 'paused', 'churned'
     - Default: 'prospect'
     - `status_notes` (text) - Notes about next actions or status context
     - `status_updated_at` (timestamptz) - Timestamp of last status change
     - Default: now()

  ## Color Inheritance System
  
  - Clients define default brand colors
  - Campaigns inherit these colors by default
  - Campaigns can override with custom colors if needed
  - Override flag stored in campaign config JSONB

  ## Status Lifecycle Guide
  
  - **prospect**: Initial state, send demo video
  - **active**: Paying client, monitor performance
  - **idle**: No recent activity, propose new promotion
  - **paused**: Temporarily inactive, check in next month
  - **churned**: Lost client, send "We Miss You" offer

  ## Important Notes
  
  1. Existing clients will have status set to 'prospect' by default
  2. Brand colors use hex format (e.g., '#6366F1')
  3. logo_url field already exists, now complemented by logo_type
  4. Status changes should update status_updated_at timestamp
*/

-- Add logo type column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS logo_type text DEFAULT 'url';

-- Add brand color columns
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#6366F1',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#8B5CF6',
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#09090B';

-- Add status management columns
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS status_notes text,
ADD COLUMN IF NOT EXISTS status_updated_at timestamptz DEFAULT now();

-- Update status column to have proper constraint
-- First, update any existing records that don't match the new constraint
UPDATE clients SET status = 'prospect' WHERE status NOT IN ('prospect', 'active', 'idle', 'paused', 'churned');

-- Drop the old constraint if it exists and add the new one
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
  
  -- Add the new constraint
  ALTER TABLE clients ADD CONSTRAINT clients_status_check 
    CHECK (status IN ('prospect', 'active', 'idle', 'paused', 'churned'));
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just add the constraint
    ALTER TABLE clients ADD CONSTRAINT clients_status_check 
      CHECK (status IN ('prospect', 'active', 'idle', 'paused', 'churned'));
END $$;

-- Create index on status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Create function to automatically update status_updated_at when status changes
CREATE OR REPLACE FUNCTION update_client_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS trigger_update_client_status_timestamp ON clients;
CREATE TRIGGER trigger_update_client_status_timestamp
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_client_status_timestamp();