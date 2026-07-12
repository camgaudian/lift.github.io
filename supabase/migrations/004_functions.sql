-- Lift: RPCs and helper functions (reference — all migrations have been applied in Supabase)

-- ---------------------------------------------------------------------------
-- Stats & workout helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION epley_1rm(weight_lb NUMERIC, reps INT)
RETURNS NUMERIC AS $$
BEGIN
  IF reps IS NULL OR reps <= 0 THEN RETURN NULL; END IF;
  IF reps = 1 THEN RETURN weight_lb; END IF;
  RETURN weight_lb * (1 + reps::NUMERIC / 30);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

-- PRs ranked by heaviest weight lifted (any rep count), not estimated 1RM
CREATE OR REPLACE FUNCTION get_exercise_prs()
RETURNS TABLE(
  exercise_id UUID,
  exercise_name TEXT,
  best_weight_lb NUMERIC,
  best_reps INT,
  achieved_at TIMESTAMPTZ
) AS $$
  WITH best_per_exercise AS (
    SELECT DISTINCT ON (e.id)
      e.id AS exercise_id,
      e.name AS exercise_name,
      ss.weight_lb + COALESCE(ss.added_weight_lb, 0) AS best_weight_lb,
      ss.reps AS best_reps,
      w.completed_at AS achieved_at
    FROM exercises e
    JOIN workout_exercises we ON we.exercise_id = e.id
    JOIN strength_sets ss ON ss.workout_exercise_id = we.id
    JOIN workouts w ON w.id = we.workout_id
    WHERE w.user_id = auth.uid()
      AND w.status = 'completed'
      AND NOT ss.is_warmup
      AND we.exercise_type IN ('strength', 'bodyweight')
      AND ss.reps > 0
    ORDER BY e.id,
      (ss.weight_lb + COALESCE(ss.added_weight_lb, 0)) DESC NULLS LAST,
      ss.reps DESC
  )
  SELECT * FROM best_per_exercise
  ORDER BY best_weight_lb DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Consecutive days with completed workouts; day boundaries use p_tz
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

-- ---------------------------------------------------------------------------
-- Display name
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_display_name_taken(
  p_display_name text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := btrim(p_display_name);

  IF normalized IS NULL OR normalized = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id <> p_user_id
      AND display_name IS NOT NULL
      AND lower(btrim(display_name)) = lower(normalized)
  );
END;
$$;

ALTER FUNCTION public.is_display_name_taken(text, uuid) SET search_path = public;

-- ---------------------------------------------------------------------------
-- PR leaderboard (friends)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Profile milestones (viewable by self or friends)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lookup_user_id_by_display_name(p_display_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  found_id uuid;
BEGIN
  normalized := btrim(p_display_name);
  IF normalized IS NULL OR normalized = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO found_id
  FROM public.profiles
  WHERE display_name IS NOT NULL
    AND lower(btrim(display_name)) = lower(normalized);

  RETURN found_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_friendship_pair(p_user_a uuid, p_user_b uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (p_user_a, p_user_b)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (p_user_b, p_user_a)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_friend_request(p_display_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_target uuid;
  v_incoming_id uuid;
  v_existing friend_request_status;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_target := public.lookup_user_id_by_display_name(p_display_name);

  IF v_target IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_target = v_me THEN
    RETURN json_build_object('ok', false, 'error', 'self');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_target AND display_name IS NOT NULL AND btrim(display_name) <> ''
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'no_username');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_id = v_me AND friend_id = v_target
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'already_friends');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE sender_id = v_me AND receiver_id = v_target AND status = 'pending'
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'request_pending');
  END IF;

  SELECT id INTO v_incoming_id
  FROM public.friend_requests
  WHERE sender_id = v_target AND receiver_id = v_me AND status = 'pending'
  LIMIT 1;

  IF v_incoming_id IS NOT NULL THEN
    UPDATE public.friend_requests
    SET status = 'accepted', updated_at = now()
    WHERE id = v_incoming_id;

    PERFORM public.create_friendship_pair(v_me, v_target);

    RETURN json_build_object('ok', true, 'auto_accepted', true, 'request_id', v_incoming_id);
  END IF;

  SELECT status INTO v_existing
  FROM public.friend_requests
  WHERE LEAST(sender_id, receiver_id) = LEAST(v_me, v_target)
    AND GREATEST(sender_id, receiver_id) = GREATEST(v_me, v_target)
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.friend_requests
    SET sender_id = v_me,
        receiver_id = v_target,
        status = 'pending',
        updated_at = now()
    WHERE LEAST(sender_id, receiver_id) = LEAST(v_me, v_target)
      AND GREATEST(sender_id, receiver_id) = GREATEST(v_me, v_target)
    RETURNING id INTO v_incoming_id;

    RETURN json_build_object('ok', true, 'request_id', v_incoming_id);
  END IF;

  INSERT INTO public.friend_requests (sender_id, receiver_id, status)
  VALUES (v_me, v_target, 'pending')
  RETURNING id INTO v_incoming_id;

  RETURN json_build_object('ok', true, 'request_id', v_incoming_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_sender uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT sender_id INTO v_sender
  FROM public.friend_requests
  WHERE id = p_request_id AND receiver_id = v_me AND status = 'pending';

  IF v_sender IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_found');
  END IF;

  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.create_friendship_pair(v_me, v_sender);

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_friend_request(p_request_id uuid)
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

  UPDATE public.friend_requests
  SET status = 'rejected', updated_at = now()
  WHERE id = p_request_id AND receiver_id = v_me AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_friend_request(p_request_id uuid)
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

  UPDATE public.friend_requests
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_request_id AND sender_id = v_me AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id uuid)
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

  DELETE FROM public.friendships
  WHERE (user_id = v_me AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = v_me);

  DELETE FROM public.friend_requests
  WHERE LEAST(sender_id, receiver_id) = LEAST(v_me, p_friend_id)
    AND GREATEST(sender_id, receiver_id) = GREATEST(v_me, p_friend_id);

  RETURN json_build_object('ok', true);
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
              'expires_at', np.expires_at,
              'my_reaction', (
                SELECT r.emoji FROM public.now_playing_reactions r
                WHERE r.owner_id = f.friend_id AND r.reactor_id = v_me
              )
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

-- ---------------------------------------------------------------------------
-- Now playing (Spotify)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_expired_now_playing()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.user_now_playing WHERE expires_at <= now();
$$;

CREATE OR REPLACE FUNCTION public.get_my_now_playing()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_row public.user_now_playing%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.delete_expired_now_playing();

  SELECT * INTO v_row
  FROM public.user_now_playing
  WHERE user_id = v_me AND expires_at > now();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'track_id', v_row.track_id,
    'title', v_row.title,
    'artist', v_row.artist,
    'album_art_url', v_row.album_art_url,
    'expires_at', v_row.expires_at
  );
END;
$$;

-- Clears reactions when the track actually changes (new song = fresh reaction context)
CREATE OR REPLACE FUNCTION public.set_now_playing(
  p_track_id text,
  p_title text,
  p_artist text,
  p_album_art_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_expires timestamptz := now() + interval '24 hours';
  v_old_track_id text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF btrim(p_track_id) = '' OR btrim(p_title) = '' OR btrim(p_artist) = '' THEN
    RAISE EXCEPTION 'track_id, title, and artist are required';
  END IF;

  SELECT track_id INTO v_old_track_id
  FROM public.user_now_playing
  WHERE user_id = v_me;

  INSERT INTO public.user_now_playing (user_id, track_id, title, artist, album_art_url, set_at, expires_at)
  VALUES (v_me, btrim(p_track_id), btrim(p_title), btrim(p_artist), NULLIF(btrim(p_album_art_url), ''), now(), v_expires)
  ON CONFLICT (user_id) DO UPDATE SET
    track_id = EXCLUDED.track_id,
    title = EXCLUDED.title,
    artist = EXCLUDED.artist,
    album_art_url = EXCLUDED.album_art_url,
    set_at = now(),
    expires_at = v_expires;

  IF v_old_track_id IS DISTINCT FROM btrim(p_track_id) THEN
    DELETE FROM public.now_playing_reactions WHERE owner_id = v_me;
  END IF;

  RETURN json_build_object(
    'track_id', btrim(p_track_id),
    'title', btrim(p_title),
    'artist', btrim(p_artist),
    'album_art_url', NULLIF(btrim(p_album_art_url), ''),
    'expires_at', v_expires
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_now_playing()
RETURNS void
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

  DELETE FROM public.user_now_playing WHERE user_id = v_me;
END;
$$;

-- ---------------------------------------------------------------------------
-- Now playing reactions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.react_to_now_playing(p_owner_id uuid, p_emoji text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_existing text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_me = p_owner_id THEN
    RETURN json_build_object('ok', false, 'error', 'self');
  END IF;

  IF p_emoji IS NULL
     OR char_length(p_emoji) < 1
     OR char_length(p_emoji) > 16
     OR p_emoji ~ '[[:cntrl:][:space:]]' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_emoji');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_id = v_me AND friend_id = p_owner_id
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'not_friends');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_now_playing
    WHERE user_id = p_owner_id AND expires_at > now()
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'no_song');
  END IF;

  SELECT emoji INTO v_existing
  FROM public.now_playing_reactions
  WHERE owner_id = p_owner_id AND reactor_id = v_me;

  IF v_existing = p_emoji THEN
    DELETE FROM public.now_playing_reactions
    WHERE owner_id = p_owner_id AND reactor_id = v_me;
    RETURN json_build_object('ok', true, 'reaction', NULL);
  END IF;

  INSERT INTO public.now_playing_reactions (owner_id, reactor_id, emoji)
  VALUES (p_owner_id, v_me, p_emoji)
  ON CONFLICT (owner_id, reactor_id) DO UPDATE SET
    emoji = EXCLUDED.emoji,
    created_at = now();

  RETURN json_build_object('ok', true, 'reaction', p_emoji);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_now_playing_reactions()
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

  RETURN COALESCE((
    SELECT json_agg(
      json_build_object(
        'reactor_id', r.reactor_id,
        'display_name', p.display_name,
        'accent_color', p.accent_color,
        'emoji', r.emoji,
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
      ORDER BY r.created_at DESC
    )
    FROM public.now_playing_reactions r
    JOIN public.profiles p ON p.id = r.reactor_id
    LEFT JOIN public.user_now_playing np
      ON np.user_id = r.reactor_id AND np.expires_at > now()
    WHERE r.owner_id = v_me
  ), '[]'::json);
END;
$$;

-- ---------------------------------------------------------------------------
-- Content sharing
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.share_exercise(p_friend_id uuid, p_exercise_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_ex public.exercises%ROWTYPE;
  v_norm text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_id = v_me AND friend_id = p_friend_id
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'not_friends');
  END IF;

  SELECT * INTO v_ex FROM public.exercises WHERE id = p_exercise_id;

  IF NOT FOUND OR v_ex.user_id IS NULL OR v_ex.user_id <> v_me THEN
    RETURN json_build_object('ok', false, 'error', 'not_owner');
  END IF;

  v_norm := public.normalized_exercise_name(v_ex.name);

  IF EXISTS (
    SELECT 1 FROM public.exercises e
    WHERE public.normalized_exercise_name(e.name) = v_norm
      AND (e.user_id = p_friend_id OR e.user_id IS NULL)
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'duplicate_name');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.shares
    WHERE sender_id = v_me AND receiver_id = p_friend_id
      AND kind = 'exercise' AND status = 'pending'
      AND source_exercise_id = p_exercise_id
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'already_pending');
  END IF;

  INSERT INTO public.shares (sender_id, receiver_id, kind, source_exercise_id, payload)
  VALUES (
    v_me, p_friend_id, 'exercise', p_exercise_id,
    jsonb_build_object(
      'name', v_ex.name,
      'exercise_type', v_ex.exercise_type,
      'category', v_ex.category,
      'primary_muscles', to_jsonb(v_ex.primary_muscles),
      'equipment', v_ex.equipment
    )
  );

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.share_template(p_friend_id uuid, p_template_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_tpl public.workout_templates%ROWTYPE;
  v_payload jsonb;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_id = v_me AND friend_id = p_friend_id
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'not_friends');
  END IF;

  SELECT * INTO v_tpl FROM public.workout_templates WHERE id = p_template_id;

  IF NOT FOUND OR v_tpl.user_id <> v_me THEN
    RETURN json_build_object('ok', false, 'error', 'not_owner');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.shares
    WHERE sender_id = v_me AND receiver_id = p_friend_id
      AND kind = 'template' AND status = 'pending'
      AND source_template_id = p_template_id
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'already_pending');
  END IF;

  SELECT jsonb_build_object(
    'name', v_tpl.name,
    'exercises', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', e.name,
          'exercise_type', e.exercise_type,
          'category', e.category,
          'primary_muscles', to_jsonb(e.primary_muscles),
          'equipment', e.equipment,
          'is_custom', (e.user_id IS NOT NULL),
          'sort_order', te.sort_order,
          'target_sets', te.target_sets,
          'target_reps', te.target_reps,
          'target_weight_lb', te.target_weight_lb
        )
        ORDER BY te.sort_order
      )
      FROM public.template_exercises te
      JOIN public.exercises e ON e.id = te.exercise_id
      WHERE te.template_id = p_template_id
    ), '[]'::jsonb)
  ) INTO v_payload;

  INSERT INTO public.shares (sender_id, receiver_id, kind, source_template_id, payload)
  VALUES (v_me, p_friend_id, 'template', p_template_id, v_payload);

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_notifications()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_items json;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH notifs AS (
    SELECT
      'friend_request'::text AS type,
      fr.id AS id,
      fr.sender_id AS sender_id,
      p.display_name AS sender_name,
      fr.created_at AS created_at,
      NULL::jsonb AS payload
    FROM public.friend_requests fr
    JOIN public.profiles p ON p.id = fr.sender_id
    WHERE fr.receiver_id = v_me AND fr.status = 'pending'

    UNION ALL

    SELECT
      CASE WHEN s.kind = 'exercise' THEN 'exercise_share' ELSE 'template_share' END,
      s.id,
      s.sender_id,
      p.display_name,
      s.created_at,
      s.payload
    FROM public.shares s
    JOIN public.profiles p ON p.id = s.sender_id
    WHERE s.receiver_id = v_me AND s.status = 'pending'
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'type', type,
      'id', id,
      'sender_id', sender_id,
      'sender_name', sender_name,
      'created_at', created_at,
      'payload', payload
    )
    ORDER BY created_at DESC
  ), '[]'::json)
  INTO v_items
  FROM notifs;

  RETURN json_build_object(
    'items', v_items,
    'unread_count', (
      SELECT count(*) FROM (
        SELECT 1 FROM public.friend_requests
        WHERE receiver_id = v_me AND status = 'pending'
        UNION ALL
        SELECT 1 FROM public.shares
        WHERE receiver_id = v_me AND status = 'pending'
      ) c
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_share(p_share_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_share public.shares%ROWTYPE;
  v_sender_name text;
  v_norm text;
  v_new_template_id uuid;
  v_item jsonb;
  v_ex_id uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_share
  FROM public.shares
  WHERE id = p_share_id AND receiver_id = v_me AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_share.kind = 'exercise' THEN
    v_norm := public.normalized_exercise_name(v_share.payload->>'name');

    IF EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE public.normalized_exercise_name(e.name) = v_norm
        AND (e.user_id = v_me OR e.user_id IS NULL)
    ) THEN
      RETURN json_build_object('ok', false, 'error', 'duplicate_name');
    END IF;

    INSERT INTO public.exercises (user_id, name, exercise_type, category, primary_muscles, equipment)
    VALUES (
      v_me,
      v_share.payload->>'name',
      (v_share.payload->>'exercise_type')::exercise_type,
      v_share.payload->>'category',
      COALESCE((SELECT array_agg(m) FROM jsonb_array_elements_text(v_share.payload->'primary_muscles') AS m), '{}'),
      NULLIF(v_share.payload->>'equipment', '')
    );
  ELSE
    SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = v_share.sender_id;

    INSERT INTO public.workout_templates (user_id, name)
    VALUES (v_me, (v_share.payload->>'name') || ' (@' || COALESCE(NULLIF(btrim(v_sender_name), ''), 'friend') || ')')
    RETURNING id INTO v_new_template_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_share.payload->'exercises')
    LOOP
      v_norm := public.normalized_exercise_name(v_item->>'name');
      v_ex_id := NULL;

      IF (v_item->>'is_custom')::boolean THEN
        SELECT id INTO v_ex_id
        FROM public.exercises
        WHERE user_id = v_me AND public.normalized_exercise_name(name) = v_norm
        LIMIT 1;
      ELSE
        SELECT id INTO v_ex_id
        FROM public.exercises
        WHERE user_id IS NULL AND public.normalized_exercise_name(name) = v_norm
        LIMIT 1;

        IF v_ex_id IS NULL THEN
          SELECT id INTO v_ex_id
          FROM public.exercises
          WHERE user_id = v_me AND public.normalized_exercise_name(name) = v_norm
          LIMIT 1;
        END IF;
      END IF;

      IF v_ex_id IS NULL THEN
        INSERT INTO public.exercises (user_id, name, exercise_type, category, primary_muscles, equipment)
        VALUES (
          v_me,
          v_item->>'name',
          (v_item->>'exercise_type')::exercise_type,
          v_item->>'category',
          COALESCE((SELECT array_agg(m) FROM jsonb_array_elements_text(v_item->'primary_muscles') AS m), '{}'),
          NULLIF(v_item->>'equipment', '')
        )
        RETURNING id INTO v_ex_id;
      END IF;

      INSERT INTO public.template_exercises (template_id, exercise_id, sort_order, target_sets, target_reps, target_weight_lb)
      VALUES (
        v_new_template_id,
        v_ex_id,
        COALESCE((v_item->>'sort_order')::int, 0),
        NULLIF(v_item->>'target_sets', '')::int,
        NULLIF(v_item->>'target_reps', '')::int,
        NULLIF(v_item->>'target_weight_lb', '')::numeric
      )
      ON CONFLICT (template_id, exercise_id) DO NOTHING;
    END LOOP;
  END IF;

  UPDATE public.shares SET status = 'accepted', updated_at = now() WHERE id = p_share_id;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_share(p_share_id uuid)
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

  UPDATE public.shares
  SET status = 'dismissed', updated_at = now()
  WHERE id = p_share_id AND receiver_id = v_me AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_cumulative_volume(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_volume(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exercise_prs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_workout_streak(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fun_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_last_session_for_exercise(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_display_name_taken(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pr_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_pr_rankings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_user_milestones(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_longest_streak_days(uuid, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_milestone_stats(uuid, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_user_id_by_display_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expired_now_playing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_now_playing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_now_playing(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_now_playing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.react_to_now_playing(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_now_playing_reactions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_exercise(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_template(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_share(uuid) TO authenticated;
