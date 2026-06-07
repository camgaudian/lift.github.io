-- Align longest streak day boundaries with current streak (user timezone)

DROP FUNCTION IF EXISTS public.get_user_milestone_stats(uuid);
DROP FUNCTION IF EXISTS public.get_longest_streak_days(uuid);

CREATE OR REPLACE FUNCTION public.get_longest_streak_days(p_user_id uuid, p_tz TEXT DEFAULT 'UTC')
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT DISTINCT (w.completed_at AT TIME ZONE p_tz)::date AS d
    FROM public.workouts w
    WHERE w.user_id = p_user_id
      AND w.status = 'completed'
      AND w.completed_at IS NOT NULL
  ),
  grouped AS (
    SELECT d, d - ROW_NUMBER() OVER (ORDER BY d)::integer AS grp
    FROM days
  )
  SELECT COALESCE(MAX(streak_len), 0)::integer
  FROM (
    SELECT COUNT(*)::integer AS streak_len
    FROM grouped
    GROUP BY grp
  ) streaks;
$$;

CREATE OR REPLACE FUNCTION public.get_user_milestone_stats(p_user_id uuid, p_tz TEXT DEFAULT 'UTC')
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_view_user_milestones(p_user_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN json_build_object(
    'cumulative_volume_lb', (
      SELECT COALESCE(SUM(
        ss.reps * (ss.weight_lb + COALESCE(ss.added_weight_lb, 0))
      ), 0)
      FROM public.strength_sets ss
      JOIN public.workout_exercises we ON we.id = ss.workout_exercise_id
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE w.user_id = p_user_id
        AND w.status = 'completed'
        AND NOT ss.is_warmup
    ),
    'total_workouts', (
      SELECT COUNT(*)
      FROM public.workouts w
      WHERE w.user_id = p_user_id AND w.status = 'completed'
    ),
    'total_sets', (
      SELECT COUNT(*)
      FROM public.strength_sets ss
      JOIN public.workout_exercises we ON we.id = ss.workout_exercise_id
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE w.user_id = p_user_id AND w.status = 'completed' AND NOT ss.is_warmup
    ),
    'total_reps', (
      SELECT COALESCE(SUM(ss.reps), 0)
      FROM public.strength_sets ss
      JOIN public.workout_exercises we ON we.id = ss.workout_exercise_id
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE w.user_id = p_user_id AND w.status = 'completed' AND NOT ss.is_warmup
    ),
    'total_cardio_seconds', (
      SELECT COALESCE(SUM(ce.duration_seconds), 0)
      FROM public.cardio_entries ce
      JOIN public.workout_exercises we ON we.id = ce.workout_exercise_id
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE w.user_id = p_user_id AND w.status = 'completed'
    ),
    'longest_streak_days', public.get_longest_streak_days(p_user_id, p_tz)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_longest_streak_days(uuid, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_milestone_stats(uuid, TEXT) TO authenticated;
