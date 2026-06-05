-- Lift: stats helper functions

-- Epley estimated 1RM
CREATE OR REPLACE FUNCTION epley_1rm(weight_lb NUMERIC, reps INT)
RETURNS NUMERIC AS $$
BEGIN
  IF reps IS NULL OR reps <= 0 THEN RETURN NULL; END IF;
  IF reps = 1 THEN RETURN weight_lb; END IF;
  RETURN weight_lb * (1 + reps::NUMERIC / 30);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Cumulative volume for a user (all-time or since date)
CREATE OR REPLACE FUNCTION get_cumulative_volume(p_since TIMESTAMPTZ DEFAULT NULL)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(
    ss.reps * (ss.weight_lb + COALESCE(ss.added_weight_lb, 0))
  ), 0)
  FROM strength_sets ss
  JOIN workout_exercises we ON we.id = ss.workout_exercise_id
  JOIN workouts w ON w.id = we.workout_id
  WHERE w.user_id = auth.uid()
    AND w.status = 'completed'
    AND NOT ss.is_warmup
    AND (p_since IS NULL OR w.completed_at >= p_since);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Weekly volume buckets for charts
CREATE OR REPLACE FUNCTION get_weekly_volume(p_weeks INT DEFAULT 12)
RETURNS TABLE(week_start DATE, volume_lb NUMERIC) AS $$
  SELECT
    date_trunc('week', w.completed_at)::DATE AS week_start,
    COALESCE(SUM(ss.reps * (ss.weight_lb + COALESCE(ss.added_weight_lb, 0))), 0) AS volume_lb
  FROM workouts w
  JOIN workout_exercises we ON we.workout_id = w.id
  JOIN strength_sets ss ON ss.workout_exercise_id = we.id
  WHERE w.user_id = auth.uid()
    AND w.status = 'completed'
    AND NOT ss.is_warmup
    AND w.completed_at >= (now() - (p_weeks || ' weeks')::INTERVAL)
  GROUP BY 1
  ORDER BY 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Per-exercise PR (best estimated 1RM)
CREATE OR REPLACE FUNCTION get_exercise_prs()
RETURNS TABLE(
  exercise_id UUID,
  exercise_name TEXT,
  best_weight_lb NUMERIC,
  best_reps INT,
  estimated_1rm_lb NUMERIC,
  achieved_at TIMESTAMPTZ
) AS $$
  SELECT DISTINCT ON (e.id)
    e.id,
    e.name,
    ss.weight_lb + COALESCE(ss.added_weight_lb, 0) AS best_weight_lb,
    ss.reps AS best_reps,
    epley_1rm(ss.weight_lb + COALESCE(ss.added_weight_lb, 0), ss.reps) AS estimated_1rm_lb,
    w.completed_at
  FROM exercises e
  JOIN workout_exercises we ON we.exercise_id = e.id
  JOIN strength_sets ss ON ss.workout_exercise_id = we.id
  JOIN workouts w ON w.id = we.workout_id
  WHERE w.user_id = auth.uid()
    AND w.status = 'completed'
    AND NOT ss.is_warmup
    AND we.exercise_type IN ('strength', 'bodyweight')
  ORDER BY e.id, epley_1rm(ss.weight_lb + COALESCE(ss.added_weight_lb, 0), ss.reps) DESC NULLS LAST;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Workout streak (consecutive days with completed workouts)
CREATE OR REPLACE FUNCTION get_workout_streak()
RETURNS INT AS $$
DECLARE
  streak INT := 0;
  check_date DATE := CURRENT_DATE;
  has_workout BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.user_id = auth.uid()
        AND w.status = 'completed'
        AND w.completed_at::DATE = check_date
    ) INTO has_workout;

    IF NOT has_workout THEN
      IF check_date = CURRENT_DATE THEN
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

-- Fun aggregate stats
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
    'heaviest_set_lb', (
      SELECT MAX(ss.weight_lb + COALESCE(ss.added_weight_lb, 0)) FROM strength_sets ss
      JOIN workout_exercises we ON we.id = ss.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = auth.uid() AND w.status = 'completed' AND NOT ss.is_warmup
    ),
    'streak_days', get_workout_streak()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Last session data for an exercise (sets + note)
CREATE OR REPLACE FUNCTION get_last_session_for_exercise(p_exercise_id UUID)
RETURNS JSON AS $$
  WITH last_we AS (
    SELECT we.id, we.workout_id, w.completed_at
    FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE w.user_id = auth.uid()
      AND w.status = 'completed'
      AND we.exercise_id = p_exercise_id
    ORDER BY w.completed_at DESC
    LIMIT 1
  )
  SELECT json_build_object(
    'sets', COALESCE((
      SELECT json_agg(json_build_object(
        'set_number', ss.set_number,
        'reps', ss.reps,
        'weight_lb', ss.weight_lb,
        'added_weight_lb', ss.added_weight_lb
      ) ORDER BY ss.set_number)
      FROM strength_sets ss
      WHERE ss.workout_exercise_id = (SELECT id FROM last_we)
    ), '[]'::json),
    'note', COALESCE((
      SELECT esn.note_for_next_time FROM exercise_session_notes esn
      WHERE esn.workout_exercise_id = (SELECT id FROM last_we)
    ), ''),
    'completed_at', (SELECT completed_at FROM last_we)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_cumulative_volume(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_volume(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exercise_prs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_workout_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION get_fun_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_last_session_for_exercise(UUID) TO authenticated;
