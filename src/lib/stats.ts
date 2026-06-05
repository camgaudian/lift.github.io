import { supabase } from './supabase'
import type { ExercisePR, FunStats, LastSessionData, WeeklyVolume } from './types'

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
  return (data ?? []) as ExercisePR[]
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
