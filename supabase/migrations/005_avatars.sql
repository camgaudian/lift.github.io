-- Lift: Profile picture support (reference — apply in Supabase SQL editor)

-- ---------------------------------------------------------------------------
-- 1. Add avatar_path column to profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT;

-- ---------------------------------------------------------------------------
-- 2. Storage bucket: avatars
--    - Not public (requires auth to access URLs)
--    - 50 KB file size limit (51200 bytes)
--    - Allowed MIME types: JPEG, PNG, WebP
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  51200,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ---------------------------------------------------------------------------
-- 3. Storage RLS policies for the avatars bucket
--    Any authenticated user can read (paths are UUIDs — effectively unguessable).
--    Only the owner can write/delete their own file (name = auth.uid()).
-- ---------------------------------------------------------------------------

CREATE POLICY "avatars_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text);

CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND name = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text);

CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND name = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 4. Update get_friend_summary to include avatar_path for each friend
-- ---------------------------------------------------------------------------

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
          'avatar_path', p.avatar_path,
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

GRANT EXECUTE ON FUNCTION public.get_friend_summary() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Update get_my_now_playing_reactions to include avatar_path for reactors
-- ---------------------------------------------------------------------------

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
        'avatar_path', p.avatar_path,
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

GRANT EXECUTE ON FUNCTION public.get_my_now_playing_reactions() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Update get_notifications to include sender_avatar_path
-- ---------------------------------------------------------------------------

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
      p.avatar_path AS sender_avatar_path,
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
      p.avatar_path,
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
      'sender_avatar_path', sender_avatar_path,
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

GRANT EXECUTE ON FUNCTION public.get_notifications() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Update get_exercise_pr_rankings to include avatar_path per ranking entry
-- ---------------------------------------------------------------------------

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
          'avatar_path', ub.avatar_path,
          'is_self', ub.user_id = v_me,
          'best_weight_lb', ub.best_weight_lb,
          'best_reps', ub.best_reps
        ) AS row_data
        FROM (
          SELECT DISTINCT ON (eu.uid)
            eu.uid AS user_id,
            p.display_name,
            p.accent_color,
            p.avatar_path,
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

GRANT EXECUTE ON FUNCTION public.get_exercise_pr_rankings(text) TO authenticated;
