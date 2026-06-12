-- Color Pop: tint surfaces/borders with the user's accent color

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS color_pop BOOLEAN NOT NULL DEFAULT false;
