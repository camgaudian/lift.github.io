-- Rank PRs by heaviest weight lifted (any rep count), not estimated 1RM

DROP FUNCTION IF EXISTS get_exercise_prs();

CREATE FUNCTION get_exercise_prs()
RETURNS TABLE(
  exercise_id UUID,
  exercise_name TEXT,
  best_weight_lb NUMERIC,
  best_reps INT,
  achieved_at TIMESTAMPTZ
) AS $$
  WITH best_per_exercise AS (
    SELECT DISTINCT ON (e.id)
      e.id AS exercise_id,
      e.name AS exercise_name,
      ss.weight_lb + COALESCE(ss.added_weight_lb, 0) AS best_weight_lb,
      ss.reps AS best_reps,
      w.completed_at AS achieved_at
    FROM exercises e
    JOIN workout_exercises we ON we.exercise_id = e.id
    JOIN strength_sets ss ON ss.workout_exercise_id = we.id
    JOIN workouts w ON w.id = we.workout_id
    WHERE w.user_id = auth.uid()
      AND w.status = 'completed'
      AND NOT ss.is_warmup
      AND we.exercise_type IN ('strength', 'bodyweight')
      AND ss.reps > 0
    ORDER BY e.id,
      (ss.weight_lb + COALESCE(ss.added_weight_lb, 0)) DESC NULLS LAST,
      ss.reps DESC
  )
  SELECT * FROM best_per_exercise
  ORDER BY best_weight_lb DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_exercise_prs() TO authenticated;
