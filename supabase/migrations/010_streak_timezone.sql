-- Fix workout streak to use the user's local timezone for day boundaries

DROP FUNCTION IF EXISTS get_fun_stats();
DROP FUNCTION IF EXISTS get_workout_streak();

CREATE OR REPLACE FUNCTION get_workout_streak(p_tz TEXT DEFAULT 'UTC')
RETURNS INT AS $$
DECLARE
  streak INT := 0;
  today_date DATE := (now() AT TIME ZONE p_tz)::DATE;
  check_date DATE := today_date;
  has_workout BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.user_id = auth.uid()
        AND w.status = 'completed'
        AND (w.completed_at AT TIME ZONE p_tz)::DATE = check_date
    ) INTO has_workout;

    IF NOT has_workout THEN
      IF check_date = today_date THEN
        check_date := check_date - 1;
        CONTINUE;
      END IF;
      EXIT;
    END IF;

    streak := streak + 1;
    check_date := check_date - 1;
  END LOOP;

  RETURN streak;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_fun_stats(p_tz TEXT DEFAULT 'UTC')
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
    'streak_days', get_workout_streak(p_tz)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_workout_streak(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fun_stats(TEXT) TO authenticated;
