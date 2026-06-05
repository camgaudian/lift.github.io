-- Per-account appearance preferences

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light'
    CHECK (theme IN ('light', 'dark')),
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#0071e3';
