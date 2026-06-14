CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  location TEXT,
  weekly_goal_km NUMERIC NOT NULL DEFAULT 10,
  private_profile BOOLEAN NOT NULL DEFAULT false,
  total_xp INTEGER NOT NULL DEFAULT 0,
  total_km NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  distance NUMERIC NOT NULL,
  time TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  pace TEXT NOT NULL,
  calories INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'RUNNING',
  route_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runs_user_created
  ON runs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_likes (
  activity_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, user_id)
);

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  image TEXT,
  price TEXT,
  official_url TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
