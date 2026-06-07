-- Lift: share a Spotify track with friends for 24 hours ("What's powering your lift?")

CREATE TABLE user_now_playing (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_art_url TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_user_now_playing_expires_at ON user_now_playing (expires_at);

ALTER TABLE user_now_playing ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_now_playing_select ON user_now_playing FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.user_id = auth.uid() AND f.friend_id = user_now_playing.user_id
    )
  );

CREATE POLICY user_now_playing_insert ON user_now_playing FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_now_playing_update ON user_now_playing FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_now_playing_delete ON user_now_playing FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Remove expired rows (called on-read from RPCs)
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
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF btrim(p_track_id) = '' OR btrim(p_title) = '' OR btrim(p_artist) = '' THEN
    RAISE EXCEPTION 'track_id, title, and artist are required';
  END IF;

  INSERT INTO public.user_now_playing (user_id, track_id, title, artist, album_art_url, set_at, expires_at)
  VALUES (v_me, btrim(p_track_id), btrim(p_title), btrim(p_artist), NULLIF(btrim(p_album_art_url), ''), now(), v_expires)
  ON CONFLICT (user_id) DO UPDATE SET
    track_id = EXCLUDED.track_id,
    title = EXCLUDED.title,
    artist = EXCLUDED.artist,
    album_art_url = EXCLUDED.album_art_url,
    set_at = now(),
    expires_at = v_expires;

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

-- Extend friend summary with active now-playing for each friend
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

GRANT EXECUTE ON FUNCTION public.delete_expired_now_playing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_now_playing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_now_playing(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_now_playing() TO authenticated;
