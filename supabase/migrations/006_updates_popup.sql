-- Lift: Home-page updates popup flag (legacy — apply in Supabase SQL editor)
--
-- Prefer 011_updates_popup_version.sql + UPDATES_POPUP_VERSION in the client.
-- This boolean is kept so old app builds can still dismiss the popup.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_updates_popup BOOLEAN NOT NULL DEFAULT false;
