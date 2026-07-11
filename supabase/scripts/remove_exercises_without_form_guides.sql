-- Remove built-in exercises with no AI form guide.
-- Run in Supabase SQL Editor after deploying updated seed data.
--
-- If this fails with a foreign-key error, those exercises are still referenced
-- in workouts or templates. Remove or swap them in the app first, then re-run.

DELETE FROM exercises
WHERE user_id IS NULL
  AND name IN (
    'Clean',
    'Meadows Row',
    'Nordic Hamstring Curl',
    'Power Clean',
    'Sissy Squat',
    'Turkish Get-Up',
    'Upright Row'
  );
