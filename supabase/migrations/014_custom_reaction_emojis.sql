-- Allow any Unicode emoji reaction (full in-app picker)

ALTER TABLE public.now_playing_reactions
  DROP CONSTRAINT IF EXISTS now_playing_reactions_emoji_check;

ALTER TABLE public.now_playing_reactions
  ADD CONSTRAINT now_playing_reactions_emoji_check
  CHECK (
    char_length(emoji) BETWEEN 1 AND 16
    AND emoji !~ '[[:cntrl:][:space:]]'
  );

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
