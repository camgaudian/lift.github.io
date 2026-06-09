-- Lift: share custom exercises & templates with friends + notification center

CREATE TYPE share_kind AS ENUM ('exercise', 'template');
CREATE TYPE share_status AS ENUM ('pending', 'accepted', 'dismissed');

CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind share_kind NOT NULL,
  status share_status NOT NULL DEFAULT 'pending',
  source_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  source_template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_shares_receiver_pending ON shares (receiver_id) WHERE status = 'pending';

-- Only one pending share of the same source to the same receiver at a time.
-- Once accepted/dismissed, the same content can be shared again.
CREATE UNIQUE INDEX shares_pending_exercise_unique
  ON shares (sender_id, receiver_id, source_exercise_id)
  WHERE status = 'pending' AND kind = 'exercise';

CREATE UNIQUE INDEX shares_pending_template_unique
  ON shares (sender_id, receiver_id, source_template_id)
  WHERE status = 'pending' AND kind = 'template';

CREATE TRIGGER shares_updated_at
  BEFORE UPDATE ON shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: rows are visible to either party; all writes happen through SECURITY DEFINER RPCs.
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY shares_select ON shares FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Share one of my custom exercises with a friend.
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

  -- Block if the friend already has any exercise (built-in or custom) with that name.
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

-- Share one of my templates (with its full exercise list) with a friend.
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

-- Incoming friend requests + pending shares, newest first, with an unread count.
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

-- Accept a pending share: add the exercise / build the template into my library.
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

-- Permanently dismiss a pending share.
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

GRANT EXECUTE ON FUNCTION public.share_exercise(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_template(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_share(uuid) TO authenticated;
