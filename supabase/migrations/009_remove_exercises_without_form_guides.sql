-- Lift: remove built-in exercises without Nifty form guides.
-- For existing databases that already ran a prior version of 008_seed_more_exercises.sql.
-- Fresh installs: 008 no longer inserts these; this migration is usually a no-op.

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
