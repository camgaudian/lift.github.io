-- Updates popup helpers (run in Supabase SQL editor)
--
-- Shipping a new announcement does NOT require SQL anymore:
--   1. Edit src/features/dashboard/updatesContent.ts
--   2. Bump UPDATES_POPUP_VERSION
--   3. Deploy
--
-- Optionally keep new signups from seeing that announcement:
--   ALTER TABLE public.profiles
--     ALTER COLUMN last_seen_updates_version SET DEFAULT 5;
--
-- Pick ONE command below for testing / force-show.
-- Setting last_seen_updates_version below the client's UPDATES_POPUP_VERSION
-- shows the popup (they see whatever copy their installed build has).

-- Everyone
-- UPDATE public.profiles SET last_seen_updates_version = 0;

-- Just you (testing)
UPDATE public.profiles
SET last_seen_updates_version = 0
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'cam.lambertt@gmail.com'
);
