import { supabase } from './supabase'
import type {
  ExercisePR,
  FunStats,
  LastSessionData,
  WeeklyVolume,
  WorkoutExercise,
  WorkoutFunStats,
} from './types'

export function computeWorkoutFunStats(exercises: WorkoutExercise[]): WorkoutFunStats {
  let total_sets = 0
  let total_reps = 0
  let volume_lb = 0
  let total_cardio_seconds = 0
  let heaviest_set_lb: number | null = null

  for (const ex of exercises) {
    for (const s of ex.strength_sets ?? []) {
      if (s.is_warmup) continue
      total_sets++
      total_reps += s.reps
      const weight = s.weight_lb + (s.added_weight_lb ?? 0)
      volume_lb += s.reps * weight
      if (heaviest_set_lb === null || weight > heaviest_set_lb) {
        heaviest_set_lb = weight
      }
    }
    if (ex.cardio_entry) {
      total_cardio_seconds += ex.cardio_entry.duration_seconds
    }
  }

  return {
    exercise_count: exercises.length,
    total_sets,
    total_reps,
    volume_lb,
    total_cardio_seconds,
    heaviest_set_lb,
  }
}

export async function fetchFunStats(): Promise<FunStats | null> {
  const { data, error } = await supabase.rpc('get_fun_stats')
  if (error) throw error
  return data as FunStats
}

export async function fetchWeeklyVolume(weeks = 12): Promise<WeeklyVolume[]> {
  const { data, error } = await supabase.rpc('get_weekly_volume', { p_weeks: weeks })
  if (error) throw error
  return (data ?? []) as WeeklyVolume[]
}

export async function fetchCumulativeVolume(since?: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_cumulative_volume', {
    p_since: since ?? null,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function fetchExercisePRs(): Promise<ExercisePR[]> {
  const { data, error } = await supabase.rpc('get_exercise_prs')
  if (error) throw error
  return ((data ?? []) as ExercisePR[])
    .map((pr) => ({
      ...pr,
      best_weight_lb: Number(pr.best_weight_lb),
      best_reps: Number(pr.best_reps),
    }))
    .sort((a, b) => b.best_weight_lb - a.best_weight_lb || b.best_reps - a.best_reps)
}

export async function fetchWorkoutStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('get_workout_streak')
  if (error) throw error
  return Number(data ?? 0)
}

export async function fetchLastSessionForExercise(exerciseId: string): Promise<LastSessionData> {
  const { data, error } = await supabase.rpc('get_last_session_for_exercise', {
    p_exercise_id: exerciseId,
  })
  if (error) throw error
  const result = data as LastSessionData | null
  return result ?? { sets: [], note: '', completed_at: null }
}
