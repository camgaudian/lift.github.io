-- Lift: Row Level Security (reference — all migrations have been applied in Supabase)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_now_playing ENABLE ROW LEVEL SECURITY;
ALTER TABLE now_playing_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- Profiles: self, friends, and pending friend-request parties
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
  WITH CHECK (EXISTS (
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

-- Friends
CREATE POLICY friend_requests_select ON friend_requests FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY friendships_select ON friendships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Now playing: self or friends
CREATE POLICY user_now_playing_select ON user_now_playing FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.user_id = auth.uid() AND f.friend_id = user_now_playing.user_id
    )
  );
CREATE POLICY user_now_playing_insert ON user_now_playing FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_now_playing_update ON user_now_playing FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_now_playing_delete ON user_now_playing FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Reactions: visible to song owner and reactor; writes via SECURITY DEFINER RPCs
CREATE POLICY now_playing_reactions_select ON now_playing_reactions FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR reactor_id = auth.uid());

-- Shares: visible to either party; writes via SECURITY DEFINER RPCs
CREATE POLICY shares_select ON shares FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
