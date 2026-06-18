-- Lift: Home-page updates popup (reference — apply in Supabase SQL editor)
--
-- When you ship updates:
--   1. Edit src/features/dashboard/updatesContent.ts with the new copy.
--   2. Run a command from supabase/scripts/updates_popup_broadcast.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_updates_popup BOOLEAN NOT NULL DEFAULT false;
