-- Lift: emoji reactions on a friend's "now playing" track.
-- One reaction per reactor per song owner (tapping the same emoji removes it,
-- a different emoji replaces it). Reactions are tied to the owner's current
-- track: they cascade away when the song is cleared/expires, and are wiped when
-- the owner switches to a different track.

CREATE TABLE now_playing_reactions (
  owner_id UUID NOT NULL REFERENCES user_now_playing(user_id) ON DELETE CASCADE,
  reactor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '🎵', '❤️', '😂', '🤘')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, reactor_id),
  CHECK (owner_id <> reactor_id)
);

CREATE INDEX idx_now_playing_reactions_owner ON now_playing_reactions (owner_id);

ALTER TABLE now_playing_reactions ENABLE ROW LEVEL SECURITY;

-- Visible to the song owner and the reactor. All writes go through the
-- SECURITY DEFINER RPCs below.
CREATE POLICY now_playing_reactions_select ON now_playing_reactions FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR reactor_id = auth.uid());

-- React to a friend's current track. Toggles off if the same emoji is sent
-- again, replaces if a different emoji is sent.
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

  IF p_emoji NOT IN ('🔥', '💪', '🎵', '❤️', '😂', '🤘') THEN
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

-- Who reacted to my current track, newest first.
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
        'emoji', r.emoji
      )
      ORDER BY r.created_at DESC
    )
    FROM public.now_playing_reactions r
    JOIN public.profiles p ON p.id = r.reactor_id
    WHERE r.owner_id = v_me
  ), '[]'::json);
END;
$$;

-- Redefine set_now_playing to clear reactions when the track actually changes
-- (a new song is a fresh reaction context). Body is otherwise identical to 013.
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

-- Redefine get_friend_summary (base: 014) to include my reaction on each
-- friend's current track, so the friend modal can highlight my choice.
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

GRANT EXECUTE ON FUNCTION public.react_to_now_playing(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_now_playing_reactions() TO authenticated;
