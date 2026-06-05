-- Add total cardio time to fun stats

CREATE OR REPLACE FUNCTION get_fun_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_workouts', (SELECT COUNT(*) FROM workouts WHERE user_id = auth.uid() AND status = 'completed'),
    'total_sets', (
      SELECT COUNT(*) FROM strength_sets ss
      JOIN workout_exercises we ON we.id = ss.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = auth.uid() AND w.status = 'completed' AND NOT ss.is_warmup
    ),
    'total_reps', (
      SELECT COALESCE(SUM(ss.reps), 0) FROM strength_sets ss
      JOIN workout_exercises we ON we.id = ss.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = auth.uid() AND w.status = 'completed' AND NOT ss.is_warmup
    ),
    'cumulative_volume_lb', get_cumulative_volume(NULL),
    'total_cardio_seconds', (
      SELECT COALESCE(SUM(ce.duration_seconds), 0) FROM cardio_entries ce
      JOIN workout_exercises we ON we.id = ce.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = auth.uid() AND w.status = 'completed'
    ),
    'heaviest_set_lb', (
      SELECT MAX(ss.weight_lb + COALESCE(ss.added_weight_lb, 0)) FROM strength_sets ss
      JOIN workout_exercises we ON we.id = ss.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = auth.uid() AND w.status = 'completed' AND NOT ss.is_warmup
    ),
    'streak_days', get_workout_streak()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
