-- Profile featured milestone + friend summary fields

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS featured_milestone_category TEXT
  CHECK (
    featured_milestone_category IS NULL
    OR featured_milestone_category IN ('weight', 'workouts', 'sets', 'reps', 'cardio', 'streak')
  );

CREATE OR REPLACE FUNCTION public.can_view_user_milestones(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE f.user_id = auth.uid() AND f.friend_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.get_longest_streak_days(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT DISTINCT (w.completed_at AT TIME ZONE 'UTC')::date AS d
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

CREATE OR REPLACE FUNCTION public.get_user_milestone_stats(p_user_id uuid)
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
    'longest_streak_days', public.get_longest_streak_days(p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_friend_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.delete_expired_now_playing();

  RETURN json_build_object(
    'friends', COALESCE((
      SELECT json_agg(
        json_build_object(
          'user_id', f.friend_id,
          'display_name', p.display_name,
          'accent_color', p.accent_color,
          'featured_milestone_category', p.featured_milestone_category,
          'now_playing', CASE
            WHEN np.user_id IS NOT NULL THEN json_build_object(
              'track_id', np.track_id,
              'title', np.title,
              'artist', np.artist,
              'album_art_url', np.album_art_url,
              'expires_at', np.expires_at
            )
            ELSE NULL
          END
        )
        ORDER BY lower(btrim(p.display_name))
      )
      FROM public.friendships f
      JOIN public.profiles p ON p.id = f.friend_id
      LEFT JOIN public.user_now_playing np
        ON np.user_id = f.friend_id AND np.expires_at > now()
      WHERE f.user_id = v_me
    ), '[]'::json),
    'incoming', COALESCE((
      SELECT json_agg(
        json_build_object(
          'request_id', fr.id,
          'user_id', fr.sender_id,
          'display_name', p.display_name
        )
        ORDER BY fr.created_at DESC
      )
      FROM public.friend_requests fr
      JOIN public.profiles p ON p.id = fr.sender_id
      WHERE fr.receiver_id = v_me AND fr.status = 'pending'
    ), '[]'::json),
    'outgoing', COALESCE((
      SELECT json_agg(
        json_build_object(
          'request_id', fr.id,
          'user_id', fr.receiver_id,
          'display_name', p.display_name
        )
        ORDER BY fr.created_at DESC
      )
      FROM public.friend_requests fr
      JOIN public.profiles p ON p.id = fr.receiver_id
      WHERE fr.sender_id = v_me AND fr.status = 'pending'
    ), '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_user_milestones(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_longest_streak_days(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_milestone_stats(uuid) TO authenticated;
