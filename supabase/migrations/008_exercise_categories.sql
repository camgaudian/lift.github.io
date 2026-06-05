-- Remap exercise categories: push/pull/legs/core/cardio -> arms/chest/shoulders/back/core/legs/cardio

UPDATE exercises SET category = 'chest' WHERE name IN (
  'Barbell Bench Press', 'Incline Barbell Bench Press', 'Dumbbell Bench Press',
  'Incline Dumbbell Press', 'Push-Up', 'Dips', 'Cable Fly'
);

UPDATE exercises SET category = 'shoulders' WHERE name IN (
  'Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Face Pull', 'Shrugs'
);

UPDATE exercises SET category = 'arms' WHERE name IN (
  'Tricep Pushdown', 'Skull Crushers', 'Barbell Curl', 'Dumbbell Curl',
  'Hammer Curl', 'Preacher Curl'
);

UPDATE exercises SET category = 'back' WHERE name IN (
  'Deadlift', 'Romanian Deadlift', 'Barbell Row', 'Dumbbell Row', 'Pull-Up',
  'Chin-Up', 'Lat Pulldown', 'Seated Cable Row'
);

UPDATE exercises SET category = 'core' WHERE name IN (
  'Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Ab Wheel Rollout',
  'Russian Twist', 'Farmer''s Walk'
);

UPDATE exercises SET category = 'legs' WHERE name IN (
  'Back Squat', 'Front Squat', 'Leg Press', 'Leg Extension', 'Leg Curl',
  'Bulgarian Split Squat', 'Walking Lunge', 'Goblet Squat', 'Hip Thrust',
  'Calf Raise', 'Kettlebell Swing'
);

-- Fallback for custom exercises still on old categories
UPDATE exercises SET category = 'back' WHERE category = 'pull';
UPDATE exercises SET category = 'chest' WHERE category = 'push';
