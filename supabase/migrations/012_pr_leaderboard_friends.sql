-- Lift: PR leaderboard with friend counts and per-exercise rankings

CREATE OR REPLACE FUNCTION public.exercise_name_to_slug(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(btrim(p_name), '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+',
      '-',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.normalized_exercise_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(p_name));
$$;

-- Friend custom exercises are only visible when the viewer also has a custom exercise with the same name.
CREATE OR REPLACE FUNCTION public.friend_exercise_visible_to_user(
  p_viewer_id uuid,
  p_normalized_name text,
  p_friend_exercise_owner_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_friend_exercise_owner_id IS NULL THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.exercises e
      WHERE e.user_id = p_viewer_id
        AND public.normalized_exercise_name(e.name) = p_normalized_name
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_pr_leaderboard()
RETURNS TABLE(
  exercise_id uuid,
  exercise_name text,
  exercise_slug text,
  best_weight_lb numeric,
  best_reps int,
  friend_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_prs AS (
    SELECT DISTINCT ON (e.id)
      e.id AS exercise_id,
      e.name AS exercise_name,
      ss.weight_lb + COALESCE(ss.added_weight_lb, 0) AS best_weight_lb,
      ss.reps AS best_reps
    FROM exercises e
    JOIN workout_exercises we ON we.exercise_id = e.id
    JOIN strength_sets ss ON ss.workout_exercise_id = we.id
    JOIN workouts w ON w.id = we.workout_id
    WHERE w.user_id = auth.uid()
      AND w.status = 'completed'
      AND NOT ss.is_warmup
      AND we.exercise_type = 'strength'
      AND ss.reps > 0
    ORDER BY e.id,
      (ss.weight_lb + COALESCE(ss.added_weight_lb, 0)) DESC NULLS LAST,
      ss.reps DESC
  )
  SELECT
    mp.exercise_id,
    mp.exercise_name,
    public.exercise_name_to_slug(mp.exercise_name) AS exercise_slug,
    mp.best_weight_lb,
    mp.best_reps,
    (
      SELECT count(DISTINCT f.friend_id)::int
      FROM public.friendships f
      WHERE f.user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.workouts w
          JOIN public.workout_exercises we ON we.workout_id = w.id
          JOIN public.strength_sets ss ON ss.workout_exercise_id = we.id
          JOIN public.exercises e ON e.id = we.exercise_id
          WHERE w.user_id = f.friend_id
            AND w.status = 'completed'
            AND we.exercise_type = 'strength'
            AND NOT ss.is_warmup
            AND ss.reps > 0
            AND public.normalized_exercise_name(e.name) =
                public.normalized_exercise_name(mp.exercise_name)
            AND public.friend_exercise_visible_to_user(
              auth.uid(),
              public.normalized_exercise_name(mp.exercise_name),
              e.user_id
            )
        )
    ) AS friend_count
  FROM my_prs mp
  ORDER BY mp.best_weight_lb DESC, mp.best_reps DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_exercise_pr_rankings(p_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_normalized_name text;
  v_result json;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT public.normalized_exercise_name(e.name) INTO v_normalized_name
  FROM public.exercises e
  JOIN public.workout_exercises we ON we.exercise_id = e.id
  JOIN public.workouts w ON w.id = we.workout_id
  WHERE w.user_id = v_me
    AND public.exercise_name_to_slug(e.name) = lower(btrim(p_slug))
  LIMIT 1;

  IF v_normalized_name IS NULL THEN
    RETURN json_build_object('exercise_name', null, 'rankings', '[]'::json);
  END IF;

  SELECT json_build_object(
    'exercise_name', (
      SELECT e.name
      FROM public.exercises e
      JOIN public.workout_exercises we ON we.exercise_id = e.id
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE w.user_id = v_me
        AND public.normalized_exercise_name(e.name) = v_normalized_name
      ORDER BY w.completed_at DESC NULLS LAST
      LIMIT 1
    ),
    'rankings', COALESCE((
      SELECT json_agg(row_data ORDER BY (row_data->>'best_weight_lb')::numeric DESC, (row_data->>'best_reps')::int DESC)
      FROM (
        SELECT json_build_object(
          'user_id', ub.user_id,
          'display_name', ub.display_name,
          'accent_color', ub.accent_color,
          'is_self', ub.user_id = v_me,
          'best_weight_lb', ub.best_weight_lb,
          'best_reps', ub.best_reps
        ) AS row_data
        FROM (
          SELECT DISTINCT ON (eu.uid)
            eu.uid AS user_id,
            p.display_name,
            p.accent_color,
            ss.weight_lb + COALESCE(ss.added_weight_lb, 0) AS best_weight_lb,
            ss.reps AS best_reps
          FROM (
            SELECT v_me AS uid
            UNION ALL
            SELECT f.friend_id FROM public.friendships f WHERE f.user_id = v_me
          ) eu
          JOIN public.workouts w ON w.user_id = eu.uid AND w.status = 'completed'
          JOIN public.workout_exercises we ON we.workout_id = w.id AND we.exercise_type = 'strength'
          JOIN public.strength_sets ss ON ss.workout_exercise_id = we.id
          JOIN public.exercises e ON e.id = we.exercise_id
          JOIN public.profiles p ON p.id = eu.uid
          WHERE NOT ss.is_warmup
            AND ss.reps > 0
            AND public.normalized_exercise_name(e.name) = v_normalized_name
            AND (
              eu.uid = v_me
              OR public.friend_exercise_visible_to_user(v_me, v_normalized_name, e.user_id)
            )
          ORDER BY eu.uid,
            (ss.weight_lb + COALESCE(ss.added_weight_lb, 0)) DESC,
            ss.reps DESC
        ) ub
      ) ranked
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pr_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_pr_rankings(text) TO authenticated;
