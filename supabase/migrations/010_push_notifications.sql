-- Lift: Web Push subscriptions, per-type prefs, and dispatch hooks

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_friend_request BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_exercise_share BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_template_share BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_workout_reminder BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_prompt_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS workout_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_workouts_pending_reminder
  ON public.workouts (started_at)
  WHERE status = 'in_progress' AND workout_reminder_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_select ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_update ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Runtime config for DB → Edge Function calls (fill via SETUP.md).
-- Not readable by anon/authenticated clients.
CREATE TABLE IF NOT EXISTS public.push_runtime_config (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  edge_function_url TEXT,
  dispatch_secret TEXT,
  app_origin TEXT
);

REVOKE ALL ON TABLE public.push_runtime_config FROM PUBLIC;
REVOKE ALL ON TABLE public.push_runtime_config FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.push_runtime_config TO postgres, service_role;

INSERT INTO public.push_runtime_config (singleton, edge_function_url, dispatch_secret, app_origin)
VALUES (true, NULL, NULL, 'https://lift.gaudian.dev')
ON CONFLICT (singleton) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Extensions (enable in Dashboard if this fails: pg_net, pg_cron)
-- ---------------------------------------------------------------------------

-- Enable in Dashboard → Database → Extensions if these statements fail.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_net not created (%). Enable it in Dashboard → Extensions.', SQLERRM;
END;
$$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not created (%). Enable it in Dashboard → Extensions.', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- Dispatch helper (no-ops until push_runtime_config is filled in)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_push_dispatch(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_secret TEXT;
BEGIN
  SELECT edge_function_url, dispatch_secret
    INTO v_url, v_secret
  FROM public.push_runtime_config
  WHERE singleton = true;

  IF v_url IS NULL OR btrim(v_url) = '' OR v_secret IS NULL OR btrim(v_secret) = '' THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', v_secret
      ),
      body := jsonb_build_object(
        'user_id', p_user_id,
        'type', p_type,
        'title', p_title,
        'body', p_body,
        'url', p_url
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'request_push_dispatch failed: %', SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.request_push_dispatch(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_push_dispatch(UUID, TEXT, TEXT, TEXT, TEXT) TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- Triggers: friend requests + shares
-- ---------------------------------------------------------------------------

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

  -- Only fire on new pending rows or transitions into pending
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
    'Lift',
    '@' || v_sender || ' sent a friend request',
    '/profile?notifications=1'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friend_requests_push_notify ON public.friend_requests;
CREATE TRIGGER friend_requests_push_notify
  AFTER INSERT OR UPDATE OF status ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request_push();

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
    'Lift',
    '@' || v_sender || ' shared a ' || v_label || ': ' || v_name,
    '/profile?notifications=1'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shares_push_notify ON public.shares;
CREATE TRIGGER shares_push_notify
  AFTER INSERT OR UPDATE OF status ON public.shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_share_push();

-- ---------------------------------------------------------------------------
-- Cron: one-time 5-hour active workout reminder
-- ---------------------------------------------------------------------------

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
      'Lift',
      'Finished with your Lift?',
      '/workout/' || r.id::text
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_workout_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_workout_reminders() TO postgres, service_role;

-- Schedule every 15 minutes (ignore if job already exists)
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lift-workout-reminders') THEN
    PERFORM cron.unschedule('lift-workout-reminders');
  END IF;
  PERFORM cron.schedule(
    'lift-workout-reminders',
    '*/15 * * * *',
    $cron$SELECT public.dispatch_workout_reminders()$cron$
  );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available — schedule dispatch_workout_reminders manually (see SETUP.md)';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule workout reminder cron: %', SQLERRM;
END;
$outer$;
