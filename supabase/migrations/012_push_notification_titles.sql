-- Use category titles for Web Push (iOS shows title above "from Lift")

CREATE OR REPLACE FUNCTION public.notify_friend_request_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(btrim(display_name), ''), 'Someone')
    INTO v_sender
  FROM public.profiles
  WHERE id = NEW.sender_id;

  PERFORM public.request_push_dispatch(
    NEW.receiver_id,
    'friend_request',
    'New friend request',
    '@' || v_sender || ' sent a friend request',
    '/profile?notifications=1'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_share_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender TEXT;
  v_name TEXT;
  v_type TEXT;
  v_label TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(btrim(display_name), ''), 'Someone')
    INTO v_sender
  FROM public.profiles
  WHERE id = NEW.sender_id;

  v_name := COALESCE(NULLIF(btrim(NEW.payload->>'name'), ''), 'something');

  IF NEW.kind = 'exercise' THEN
    v_type := 'exercise_share';
    v_label := 'exercise';
  ELSE
    v_type := 'template_share';
    v_label := 'template';
  END IF;

  PERFORM public.request_push_dispatch(
    NEW.receiver_id,
    v_type,
    CASE WHEN NEW.kind = 'exercise' THEN 'New exercise share' ELSE 'New template share' END,
    '@' || v_sender || ' shared a ' || v_label || ': ' || v_name,
    '/profile?notifications=1'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_workout_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT w.id, w.user_id
    FROM public.workouts w
    WHERE w.status = 'in_progress'
      AND w.started_at < now() - interval '5 hours'
      AND w.workout_reminder_sent_at IS NULL
    ORDER BY w.started_at ASC
    LIMIT 100
    FOR UPDATE OF w SKIP LOCKED
  LOOP
    UPDATE public.workouts
    SET workout_reminder_sent_at = now()
    WHERE id = r.id;

    PERFORM public.request_push_dispatch(
      r.user_id,
      'workout_reminder',
      'Unfinished workout',
      'Finished with your Lift?',
      '/workout/' || r.id::text
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
