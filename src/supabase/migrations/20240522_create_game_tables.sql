/* 
# Create Game Tables
1. New Tables
   - `games`: Stores game configuration and settings
   - `leads`: Stores captured user data
   - `redemptions`: Stores coupon/prize redemptions
2. Security
   - Enable RLS on all tables
   - Add policies for public read access (for playing)
   - Add policies for authenticated/anon write access (for saving)
*/

-- GAMES TABLE
CREATE TABLE IF NOT EXISTS games (
  id text PRIMARY KEY,
  name text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read games (so they can play)
CREATE POLICY "Public games are viewable by everyone" 
  ON games FOR SELECT 
  USING (true);

-- Allow anyone to insert/update games (for this builder demo)
-- In a real app, you would restrict this to authenticated admin users
CREATE POLICY "Anyone can insert games" 
  ON games FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update games" 
  ON games FOR UPDATE 
  USING (true);

CREATE POLICY "Anyone can delete games" 
  ON games FOR DELETE 
  USING (true);


-- LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  game_id text REFERENCES games(id),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can insert leads" 
  ON leads FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Everyone can view leads" 
  ON leads FOR SELECT 
  USING (true);


-- REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS redemptions (
  id text PRIMARY KEY,
  game_id text REFERENCES games(id),
  prize_name text,
  short_code text,
  status text DEFAULT 'active',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can insert redemptions" 
  ON redemptions FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Everyone can read redemptions" 
  ON redemptions FOR SELECT 
  USING (true);

CREATE POLICY "Everyone can update redemptions" 
  ON redemptions FOR UPDATE 
  USING (true);