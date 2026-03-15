/*
  # Add games table

  ## Summary
  Creates the missing `games` table that GameContext.jsx expects to read/write game configurations.

  ## New Tables
  - `games`
    - `id` (uuid, primary key)
    - `name` (text) - display name of the game configuration
    - `is_active` (boolean) - whether the game is active
    - `data` (jsonb) - full game configuration stored as JSON
    - `client_id` (uuid, nullable) - scopes game to a specific client; NULL = agency-level game
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on `games` table
  - Agency admins (admin, super_admin) have full access
  - Client admins (client, client_admin) can manage games belonging to their own client_id
  - No public access

  ## Notes
  1. GameContext.jsx currently expects id, name, is_active, data, created_at columns
  2. The data column stores the full game object as JSONB for flexibility
  3. client_id is nullable to support agency-level game templates
*/

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can select all games"
  ON games FOR SELECT
  TO authenticated
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Agency admins can insert games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Agency admins can update all games"
  ON games FOR UPDATE
  TO authenticated
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Agency admins can delete all games"
  ON games FOR DELETE
  TO authenticated
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Client admins can select their games"
  ON games FOR SELECT
  TO authenticated
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Client admins can insert their games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Client admins can update their games"
  ON games FOR UPDATE
  TO authenticated
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Client admins can delete their games"
  ON games FOR DELETE
  TO authenticated
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('client', 'client_admin')
    AND client_id = (SELECT p.client_id FROM profiles p WHERE p.id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS games_client_id_idx ON games(client_id);
CREATE INDEX IF NOT EXISTS games_created_at_idx ON games(created_at DESC);
