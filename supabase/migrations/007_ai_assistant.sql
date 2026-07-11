-- Lift: Nifty — form article RAG + user-data summary RPCs

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE form_article_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name TEXT NOT NULL,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  source_slug TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_slug, section)
);

CREATE INDEX form_article_chunks_embedding_idx
  ON form_article_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX form_article_chunks_exercise_name_idx
  ON form_article_chunks (exercise_name);

ALTER TABLE form_article_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY form_article_chunks_select ON form_article_chunks
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION match_form_chunks(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE(
  content TEXT,
  exercise_name TEXT,
  section TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.content,
    c.exercise_name,
    c.section,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM form_article_chunks c
  WHERE (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION get_recent_workouts_summary(p_limit INT DEFAULT 5)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE((
    SELECT json_agg(workout_row ORDER BY workout_row->>'completed_at' DESC)
    FROM (
      SELECT json_build_object(
        'workout_id', w.id,
        'completed_at', w.completed_at,
        'template_name', wt.name,
        'notes', w.notes,
        'exercises', COALESCE((
          SELECT json_agg(
            json_build_object(
              'exercise_id', e.id,
              'exercise_name', e.name,
              'exercise_type', we.exercise_type,
              'sets', COALESCE((
                SELECT json_agg(
                  json_build_object(
                    'set_number', ss.set_number,
                    'reps', ss.reps,
                    'weight_lb', ss.weight_lb,
                    'added_weight_lb', ss.added_weight_lb,
                    'is_warmup', ss.is_warmup
                  ) ORDER BY ss.set_number
                )
                FROM strength_sets ss
                WHERE ss.workout_exercise_id = we.id
              ), '[]'::json),
              'cardio', (
                SELECT json_build_object(
                  'duration_seconds', ce.duration_seconds,
                  'distance_miles', ce.distance_miles,
                  'calories', ce.calories
                )
                FROM cardio_entries ce
                WHERE ce.workout_exercise_id = we.id
              ),
              'session_note', COALESCE((
                SELECT esn.note_for_next_time
                FROM exercise_session_notes esn
                WHERE esn.workout_exercise_id = we.id
              ), '')
            )
            ORDER BY we.sort_order
          )
          FROM workout_exercises we
          JOIN exercises e ON e.id = we.exercise_id
          WHERE we.workout_id = w.id
        ), '[]'::json)
      ) AS workout_row
      FROM workouts w
      LEFT JOIN workout_templates wt ON wt.id = w.template_id
      WHERE w.user_id = v_me
        AND w.status = 'completed'
      ORDER BY w.completed_at DESC NULLS LAST
      LIMIT GREATEST(1, LEAST(p_limit, 20))
    ) sub
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION get_my_templates_summary()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE((
    SELECT json_agg(
      json_build_object(
        'template_id', wt.id,
        'name', wt.name,
        'exercises', COALESCE((
          SELECT json_agg(
            json_build_object(
              'exercise_id', e.id,
              'exercise_name', e.name,
              'exercise_type', e.exercise_type,
              'target_sets', te.target_sets,
              'target_reps', te.target_reps,
              'target_weight_lb', te.target_weight_lb
            )
            ORDER BY te.sort_order
          )
          FROM template_exercises te
          JOIN exercises e ON e.id = te.exercise_id
          WHERE te.template_id = wt.id
        ), '[]'::json)
      )
      ORDER BY wt.name
    )
    FROM workout_templates wt
    WHERE wt.user_id = v_me
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION get_active_workout_snapshot(
  p_workout_id UUID,
  p_current_exercise_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_workout workouts%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_workout
  FROM workouts
  WHERE id = p_workout_id
    AND user_id = v_me
    AND status = 'in_progress';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'workout_id', v_workout.id,
    'started_at', v_workout.started_at,
    'template_id', v_workout.template_id,
    'current_exercise_id', p_current_exercise_id,
    'exercises', COALESCE((
      SELECT json_agg(
        json_build_object(
          'workout_exercise_id', we.id,
          'exercise_id', e.id,
          'exercise_name', e.name,
          'exercise_type', we.exercise_type,
          'is_current', (p_current_exercise_id IS NOT NULL AND e.id = p_current_exercise_id),
          'sets', COALESCE((
            SELECT json_agg(
              json_build_object(
                'set_number', ss.set_number,
                'reps', ss.reps,
                'weight_lb', ss.weight_lb,
                'added_weight_lb', ss.added_weight_lb,
                'is_warmup', ss.is_warmup
              ) ORDER BY ss.set_number
            )
            FROM strength_sets ss
            WHERE ss.workout_exercise_id = we.id
          ), '[]'::json),
          'cardio', (
            SELECT json_build_object(
              'duration_seconds', ce.duration_seconds,
              'distance_miles', ce.distance_miles,
              'calories', ce.calories
            )
            FROM cardio_entries ce
            WHERE ce.workout_exercise_id = we.id
          ),
          'session_note', COALESCE((
            SELECT esn.note_for_next_time
            FROM exercise_session_notes esn
            WHERE esn.workout_exercise_id = we.id
          ), '')
        )
        ORDER BY we.sort_order
      )
      FROM workout_exercises we
      JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = v_workout.id
    ), '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION match_form_chunks(vector(768), INT, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_workouts_summary(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_templates_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_workout_snapshot(UUID, UUID) TO authenticated;
