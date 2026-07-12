-- Song reaction push notifications

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_song_reaction BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.notify_song_reaction_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reactor TEXT;
  v_title TEXT;
BEGIN
  SELECT COALESCE(NULLIF(btrim(display_name), ''), 'Someone')
    INTO v_reactor
  FROM public.profiles
  WHERE id = NEW.reactor_id;

  SELECT COALESCE(NULLIF(btrim(title), ''), 'your song')
    INTO v_title
  FROM public.user_now_playing
  WHERE user_id = NEW.owner_id;

  PERFORM public.request_push_dispatch(
    NEW.owner_id,
    'song_reaction',
    'New song reaction',
    '@' || v_reactor || ' reacted ' || NEW.emoji || ' to ' || v_title,
    '/profile'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS now_playing_reactions_push_notify ON public.now_playing_reactions;
CREATE TRIGGER now_playing_reactions_push_notify
  AFTER INSERT OR UPDATE OF emoji ON public.now_playing_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_song_reaction_push();
