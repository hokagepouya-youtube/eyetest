-- ============================================================
-- FC Bayern Munich Player Rating Site — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bayern Munich squad
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
  squad_number int,
  photo_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Manager
CREATE TABLE managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  photo_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Matches
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  opponent text NOT NULL,
  competition text,
  home_away text CHECK (home_away IN ('home', 'away')),
  score_for int,
  score_against int,
  formation text,
  opponent_logo_url text,
  manager_id uuid REFERENCES managers(id),
  created_at timestamptz DEFAULT now()
);

-- Lineup entries per match
CREATE TABLE match_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('starter', 'sub_in', 'unused')),
  sub_minute int,
  specific_position text,   -- e.g. 'LB', 'CDM', 'ST' — match-specific role
  formation_line int,        -- column index on pitch (0=GK, 1=DEF, 2=MID, ...)
  goals int DEFAULT 0 NOT NULL,
  assists int DEFAULT 0 NOT NULL,
  UNIQUE(match_id, player_id)
);

-- If upgrading an existing database, run these in Supabase SQL Editor:
-- ALTER TABLE match_lineups ADD COLUMN IF NOT EXISTS goals int DEFAULT 0 NOT NULL;
-- ALTER TABLE match_lineups ADD COLUMN IF NOT EXISTS assists int DEFAULT 0 NOT NULL;

-- Player ratings (one per user per player per match)
CREATE TABLE player_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  rating numeric(3,1) CHECK (rating >= 1.0 AND rating <= 10.0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, match_id, player_id)
);

-- Manager ratings (one per user per match)
CREATE TABLE manager_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES managers(id) ON DELETE CASCADE,
  rating numeric(3,1) CHECK (rating >= 1.0 AND rating <= 10.0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, match_id, manager_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_ratings ENABLE ROW LEVEL SECURITY;

-- profiles: users read their own, admins read all
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- players: everyone can read, only admins can write
CREATE POLICY "Anyone can read players" ON players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert players" ON players
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update players" ON players
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- managers: same as players
CREATE POLICY "Anyone can read managers" ON managers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert managers" ON managers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update managers" ON managers
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- matches: everyone reads, admins write
CREATE POLICY "Anyone can read matches" ON matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert matches" ON matches
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update matches" ON matches
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- match_lineups: everyone reads, admins write
CREATE POLICY "Anyone can read lineups" ON match_lineups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert lineups" ON match_lineups
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update lineups" ON match_lineups
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete lineups" ON match_lineups
  FOR DELETE TO authenticated
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- player_ratings: users manage their own, everyone reads
CREATE POLICY "Anyone can read player ratings" ON player_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own player ratings" ON player_ratings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own player ratings" ON player_ratings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- manager_ratings: users manage their own, everyone reads
CREATE POLICY "Anyone can read manager ratings" ON manager_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own manager ratings" ON manager_ratings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manager ratings" ON manager_ratings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Seed: Current Bayern Munich Squad (2025/26 season)
-- ============================================================

INSERT INTO managers (name, active) VALUES
  ('Vincent Kompany', true);

INSERT INTO players (name, position, squad_number, active) VALUES
  ('Manuel Neuer', 'GK', 1, true),
  ('Sven Ulreich', 'GK', 26, true),
  ('Daniel Peretz', 'GK', 25, true),
  ('Dayot Upamecano', 'DEF', 2, true),
  ('Matthijs de Ligt', 'DEF', 4, true),
  ('Kim Min-jae', 'DEF', 3, true),
  ('Alphonso Davies', 'DEF', 19, true),
  ('Konrad Laimer', 'DEF', 27, true),
  ('Noussair Mazraoui', 'DEF', 40, true),
  ('Hiroki Ito', 'DEF', 32, true),
  ('João Palhinha', 'MID', 8, true),
  ('Leon Goretzka', 'MID', 14, true),
  ('Joshua Kimmich', 'MID', 6, true),
  ('Thomas Müller', 'MID', 25, true),
  ('Aleksandar Pavlović', 'MID', 45, true),
  ('Michael Olise', 'MID', 31, true),
  ('Jamal Musiala', 'MID', 42, true),
  ('Leroy Sané', 'FWD', 10, true),
  ('Serge Gnabry', 'FWD', 7, true),
  ('Harry Kane', 'FWD', 9, true),
  ('Eric Maxim Choupo-Moting', 'FWD', 13, true);
