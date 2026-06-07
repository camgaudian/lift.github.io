-- Lift: friends (request/accept mutual) + add-friend warning preference

CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hide_add_friend_warning BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status friend_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

CREATE TABLE friendships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE INDEX idx_friend_requests_receiver_pending
  ON friend_requests (receiver_id)
  WHERE status = 'pending';

CREATE INDEX idx_friend_requests_sender_pending
  ON friend_requests (sender_id)
  WHERE status = 'pending';

CREATE INDEX idx_friendships_user ON friendships (user_id);

CREATE UNIQUE INDEX friend_requests_pair_unique
  ON friend_requests (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id)
  );

CREATE TRIGGER friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY friend_requests_select ON friend_requests FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY friendships_select ON friendships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow reading display names for friends and pending request parties
CREATE POLICY profiles_select_social ON profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.user_id = auth.uid() AND f.friend_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM friend_requests fr
      WHERE fr.status = 'pending'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = profiles.id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = profiles.id)
        )
    )
  );

DROP POLICY IF EXISTS profiles_select ON profiles;

-- Helpers

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

  RETURN json_build_object(
    'friends', COALESCE((
      SELECT json_agg(
        json_build_object(
          'user_id', f.friend_id,
          'display_name', p.display_name
        )
        ORDER BY lower(btrim(p.display_name))
      )
      FROM public.friendships f
      JOIN public.profiles p ON p.id = f.friend_id
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

GRANT EXECUTE ON FUNCTION public.lookup_user_id_by_display_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_summary() TO authenticated;
