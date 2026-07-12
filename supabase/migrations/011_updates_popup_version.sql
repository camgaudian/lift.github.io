-- Lift: Versioned updates popup (apply in Supabase SQL editor)
--
-- Replaces the show_updates_popup boolean broadcast flow.
-- Clients show the popup when last_seen_updates_version < UPDATES_POPUP_VERSION
-- (see src/features/dashboard/updatesContent.ts). Bump the client version when
-- shipping new copy — no SQL reset required for existing users.
--
-- Keep show_updates_popup for old app builds that still read/write it.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_updates_version INTEGER NOT NULL DEFAULT 0;

-- Current shipped popup version is 4 (Update 4.4). Users who already dismissed
-- the boolean popup are treated as having seen v4; pending users stay at 0.
UPDATE public.profiles
SET last_seen_updates_version = 4
WHERE show_updates_popup = false
  AND last_seen_updates_version = 0;

-- New signups should not see a "what's new" for the version they joined on.
ALTER TABLE public.profiles
  ALTER COLUMN last_seen_updates_version SET DEFAULT 4;
