export type ExerciseType = 'strength' | 'bodyweight' | 'cardio'
export type WorkoutStatus = 'in_progress' | 'completed'

export interface Profile {
  id: string
  display_name: string | null
  unit_preference: string
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  user_id: string | null
  name: string
  exercise_type: ExerciseType
  category: string
  primary_muscles: string[]
  equipment: string | null
  created_at: string
}

export interface WorkoutTemplate {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  sort_order: number
  target_sets: number | null
  target_reps: number | null
  target_weight_lb: number | null
  exercise?: Exercise
}

export interface Workout {
  id: string
  user_id: string
  template_id: string | null
  status: WorkoutStatus
  started_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  sort_order: number
  exercise_type: ExerciseType
  exercise?: Exercise
  strength_sets?: StrengthSet[]
  cardio_entry?: CardioEntry | null
  session_note?: ExerciseSessionNote | null
}

export interface StrengthSet {
  id?: string
  workout_exercise_id?: string
  set_number: number
  reps: number
  weight_lb: number
  added_weight_lb: number | null
  is_warmup: boolean
}

export interface CardioEntry {
  id?: string
  workout_exercise_id?: string
  duration_seconds: number
  distance_miles: number | null
  calories: number | null
}

export interface ExerciseSessionNote {
  id?: string
  workout_exercise_id?: string
  note_for_next_time: string
}

export interface LastSessionData {
  sets: StrengthSet[]
  note: string
  completed_at: string | null
}

export interface ExercisePR {
  exercise_id: string
  exercise_name: string
  best_weight_lb: number
  best_reps: number
  estimated_1rm_lb: number
  achieved_at: string
}

export interface FunStats {
  total_workouts: number
  total_sets: number
  total_reps: number
  cumulative_volume_lb: number
  heaviest_set_lb: number | null
  streak_days: number
}

export interface WeeklyVolume {
  week_start: string
  volume_lb: number
}
