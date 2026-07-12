-- Lift: database schema (reference — all migrations have been applied in Supabase)

-- Types

CREATE TYPE exercise_type AS ENUM ('strength', 'bodyweight', 'cardio');
CREATE TYPE workout_status AS ENUM ('in_progress', 'completed');
CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
CREATE TYPE share_kind AS ENUM ('exercise', 'template');
CREATE TYPE share_status AS ENUM ('pending', 'accepted', 'dismissed');

-- Profiles

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  unit_preference TEXT NOT NULL DEFAULT 'lb',
  theme TEXT NOT NULL DEFAULT 'light'
    CHECK (theme IN ('light', 'dark')),
  accent_color TEXT NOT NULL DEFAULT '#0071e3',
  color_pop BOOLEAN NOT NULL DEFAULT false,
  hide_add_friend_warning BOOLEAN NOT NULL DEFAULT false,
  featured_milestone_category TEXT
    CHECK (
      featured_milestone_category IS NULL
      OR featured_milestone_category IN ('weight', 'workouts', 'sets', 'reps', 'cardio', 'streak')
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_display_name_lower_btrim_unique
  ON public.profiles (lower(btrim(display_name)))
  WHERE display_name IS NOT NULL;

-- Exercises & workouts

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exercise_type exercise_type NOT NULL DEFAULT 'strength',
  category TEXT NOT NULL,
  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sort_order INT NOT NULL DEFAULT 0,
  target_sets INT,
  target_reps INT,
  target_weight_lb NUMERIC(8, 2),
  UNIQUE (template_id, exercise_id)
);

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  status workout_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sort_order INT NOT NULL DEFAULT 0,
  exercise_type exercise_type NOT NULL
);

CREATE TABLE strength_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  reps INT NOT NULL,
  weight_lb NUMERIC(8, 2) NOT NULL DEFAULT 0,
  added_weight_lb NUMERIC(8, 2),
  is_warmup BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (workout_exercise_id, set_number)
);

CREATE TABLE cardio_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL UNIQUE REFERENCES workout_exercises(id) ON DELETE CASCADE,
  duration_seconds INT NOT NULL,
  distance_miles NUMERIC(8, 2),
  calories INT
);

CREATE TABLE exercise_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL UNIQUE REFERENCES workout_exercises(id) ON DELETE CASCADE,
  note_for_next_time TEXT NOT NULL DEFAULT ''
);

-- Friends

CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status friend_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

CREATE TABLE friendships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

-- Now playing (Spotify track shared with friends for 24 hours)

CREATE TABLE user_now_playing (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_art_url TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- One reaction per reactor per song owner; tied to owner's current track (cascade on
-- track change/expiry). Allowed emojis must match src/lib/reactions.ts REACTION_EMOJIS.
CREATE TABLE now_playing_reactions (
  owner_id UUID NOT NULL REFERENCES user_now_playing(user_id) ON DELETE CASCADE,
  reactor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '🗣️', '💔', '💀', '😩')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, reactor_id),
  CHECK (owner_id <> reactor_id)
);

-- Content sharing (custom exercises & templates between friends)

CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind share_kind NOT NULL,
  status share_status NOT NULL DEFAULT 'pending',
  source_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  source_template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

-- Indexes

CREATE INDEX idx_exercises_user ON exercises(user_id);
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_workouts_user ON workouts(user_id);
CREATE INDEX idx_workouts_started ON workouts(user_id, started_at DESC);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_strength_sets_we ON strength_sets(workout_exercise_id);
CREATE INDEX idx_template_exercises_template ON template_exercises(template_id);

CREATE INDEX idx_friend_requests_receiver_pending
  ON friend_requests (receiver_id)
  WHERE status = 'pending';
CREATE INDEX idx_friend_requests_sender_pending
  ON friend_requests (sender_id)
  WHERE status = 'pending';
CREATE INDEX idx_friendships_user ON friendships (user_id);
CREATE UNIQUE INDEX friend_requests_pair_unique
  ON friend_requests (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id)
  );

CREATE INDEX idx_user_now_playing_expires_at ON user_now_playing (expires_at);
CREATE INDEX idx_now_playing_reactions_owner ON now_playing_reactions (owner_id);

CREATE INDEX idx_shares_receiver_pending ON shares (receiver_id) WHERE status = 'pending';
CREATE UNIQUE INDEX shares_pending_exercise_unique
  ON shares (sender_id, receiver_id, source_exercise_id)
  WHERE status = 'pending' AND kind = 'exercise';
CREATE UNIQUE INDEX shares_pending_template_unique
  ON shares (sender_id, receiver_id, source_template_id)
  WHERE status = 'pending' AND kind = 'template';

-- Triggers

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workout_templates_updated_at
  BEFORE UPDATE ON workout_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shares_updated_at
  BEFORE UPDATE ON shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
