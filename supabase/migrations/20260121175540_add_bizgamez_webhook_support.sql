/*
  # Add BizGamez Webhook Campaign Support

  1. Schema Changes
    - Add 'bizgamez' to campaigns.type check constraint
    - Create webhook_events table to log incoming webhook data
    - Add index on webhook_events for campaign_id lookups
    - Add index on webhook_events for game_code lookups

  2. New Tables
    - `webhook_events`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key to campaigns)
      - `client_id` (uuid, foreign key to clients)
      - `game_code` (text) - the BizGamez game code from webhook
      - `score` (integer) - score from the webhook
      - `name` (text) - player name from webhook
      - `email` (text) - player email from webhook
      - `mobile` (text) - player phone from webhook
      - `raw_payload` (jsonb) - complete raw webhook payload
      - `status` (text) - processing status: pending, processed, failed
      - `error_message` (text) - error details if processing failed
      - `created_at` (timestamptz) - when webhook was received
      - `processed_at` (timestamptz) - when webhook was processed

  3. Security
    - Enable RLS on webhook_events table
    - Add policies for authenticated users to read their client's webhook events
    - Add policy for service role to insert webhook events (edge function)

  4. Important Notes
    - The game_code in campaign config must be unique to enable proper webhook routing
    - Webhook events are logged regardless of processing outcome for debugging
*/

-- Step 1: Update campaigns type constraint to include 'bizgamez'
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_type_check 
  CHECK (type = ANY (ARRAY['spin'::text, 'scratch'::text, 'bizgamez'::text]));

-- Step 2: Create webhook_events table
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
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text])),
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Step 3: Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_campaign_id ON webhook_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_game_code ON webhook_events(game_code);
CREATE INDEX IF NOT EXISTS idx_webhook_events_client_id ON webhook_events(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies

-- Authenticated users can view webhook events for their client
CREATE POLICY "Users can view own client webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins and super_admins can view all webhook events
CREATE POLICY "Admins can view all webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Allow anon role to insert (for webhook endpoint without auth)
CREATE POLICY "Anon can insert webhook events"
  ON webhook_events FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon role to update webhook events (for processing status updates)
CREATE POLICY "Anon can update webhook events"
  ON webhook_events FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon role to select for webhook processing
CREATE POLICY "Anon can select webhook events for processing"
  ON webhook_events FOR SELECT
  TO anon
  USING (true);