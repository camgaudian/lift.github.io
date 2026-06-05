-- Lift: Username uniqueness + server-side availability check

-- Normalize existing values to reduce accidental duplicates
UPDATE public.profiles
SET display_name = btrim(display_name)
WHERE display_name IS NOT NULL;

-- Enforce case-insensitive, trimmed uniqueness for non-null display names
CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_lower_btrim_unique
ON public.profiles (lower(btrim(display_name)))
WHERE display_name IS NOT NULL;

-- Availability check used by the Settings UI.
-- SECURITY DEFINER is required to bypass RLS for looking up other users.
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

GRANT EXECUTE ON FUNCTION public.is_display_name_taken(text, uuid) TO authenticated;

