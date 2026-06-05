-- Lift: Row Level Security

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_session_notes ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Exercises: built-in (user_id IS NULL) readable by all authenticated; custom owned by user
CREATE POLICY exercises_select ON exercises FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY exercises_insert ON exercises FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY exercises_update ON exercises FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY exercises_delete ON exercises FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Workout templates
CREATE POLICY workout_templates_all ON workout_templates FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Template exercises (via template ownership)
CREATE POLICY template_exercises_select ON template_exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_templates wt WHERE wt.id = template_id AND wt.user_id = auth.uid()
  ));
CREATE POLICY template_exercises_insert ON template_exercises FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_templates wt WHERE wt.id = template_id AND wt.user_id = auth.uid()
  ));
CREATE POLICY template_exercises_update ON template_exercises FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_templates wt WHERE wt.id = template_id AND wt.user_id = auth.uid()
  ));
CREATE POLICY template_exercises_delete ON template_exercises FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_templates wt WHERE wt.id = template_id AND wt.user_id = auth.uid()
  ));

-- Workouts
CREATE POLICY workouts_all ON workouts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Workout exercises (via workout ownership)
CREATE POLICY workout_exercises_select ON workout_exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()
  ));
CREATE POLICY workout_exercises_insert ON workout_exercises FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()
  ));
CREATE POLICY workout_exercises_update ON workout_exercises FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()
  ));
CREATE POLICY workout_exercises_delete ON workout_exercises FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()
  ));

-- Strength sets (via workout exercise -> workout ownership)
CREATE POLICY strength_sets_all ON strength_sets FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));

-- Cardio entries
CREATE POLICY cardio_entries_all ON cardio_entries FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));

-- Exercise session notes
CREATE POLICY exercise_session_notes_all ON exercise_session_notes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));
