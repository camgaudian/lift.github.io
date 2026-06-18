-- Show the home-page updates popup (run in Supabase SQL editor after editing updatesContent.ts)
--
-- Pick ONE command below.

-- Everyone
UPDATE public.profiles SET show_updates_popup = true;

-- Just you (testing) — replace the email with yours, or swap for: WHERE id = 'your-user-uuid'
UPDATE public.profiles
SET show_updates_popup = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'cam.lambertt@gmail.com'
);
