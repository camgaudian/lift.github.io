import { supabase } from './supabase'
import { format, parseISO, subDays, startOfDay } from 'date-fns'

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
import type {
  ExercisePrRankings,
  FunStats,
  LastSessionData,
  PrLeaderboardEntry,
  WeeklyVolume,
  WorkoutExercise,
  WorkoutFunStats,
} from './types'

export function computeWorkoutStreak(completedAts: (string | null | undefined)[]): number {
  const days = new Set(
    completedAts
      .filter((iso): iso is string => Boolean(iso))
      .map((iso) => format(parseISO(iso), 'yyyy-MM-dd')),
  )

  let streak = 0
  let check = startOfDay(new Date())

  if (!days.has(format(check, 'yyyy-MM-dd'))) {
    check = subDays(check, 1)
  }

  while (days.has(format(check, 'yyyy-MM-dd'))) {
    streak++
    check = subDays(check, 1)
  }

  return streak
}

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
  const [statsResult, workoutsResult] = await Promise.all([
    supabase.rpc('get_fun_stats'),
    supabase.from('workouts').select('completed_at').eq('status', 'completed'),
  ])

  if (statsResult.error) throw statsResult.error

  const completedAts = (workoutsResult.data ?? []).map((w) => w.completed_at)
  const stats = statsResult.data as FunStats
  return {
    ...stats,
    streak_days: computeWorkoutStreak(completedAts),
  }
}

export interface MilestoneStats {
  cumulative_volume_lb: number
  total_workouts: number
  total_sets: number
  total_reps: number
  total_cardio_seconds: number
  longest_streak_days: number
}

function normalizeMilestoneStats(stats: MilestoneStats): MilestoneStats {
  return {
    cumulative_volume_lb: Number(stats.cumulative_volume_lb ?? 0),
    total_workouts: Number(stats.total_workouts ?? 0),
    total_sets: Number(stats.total_sets ?? 0),
    total_reps: Number(stats.total_reps ?? 0),
    total_cardio_seconds: Number(stats.total_cardio_seconds ?? 0),
    longest_streak_days: Number(stats.longest_streak_days ?? 0),
  }
}

export async function fetchMilestoneStats(): Promise<MilestoneStats> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Not authenticated')
  return fetchFriendMilestoneStats(user.id)
}

export async function fetchFriendMilestoneStats(
  userId: string,
  timezone = getBrowserTimezone(),
): Promise<MilestoneStats> {
  const { data, error } = await supabase.rpc('get_user_milestone_stats', {
    p_user_id: userId,
    p_tz: timezone,
  })
  if (error) throw error
  return normalizeMilestoneStats(data as MilestoneStats)
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

export async function fetchPrLeaderboard(): Promise<PrLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_pr_leaderboard')
  if (error) throw error
  return ((data ?? []) as PrLeaderboardEntry[]).map((entry) => ({
    ...entry,
    best_weight_lb: Number(entry.best_weight_lb),
    best_reps: Number(entry.best_reps),
    friend_count: Number(entry.friend_count),
  }))
}

export async function fetchExercisePrRankings(slug: string): Promise<ExercisePrRankings> {
  const { data, error } = await supabase.rpc('get_exercise_pr_rankings', { p_slug: slug })
  if (error) throw error
  const result = data as ExercisePrRankings
  return {
    exercise_name: result.exercise_name,
    rankings: (result.rankings ?? []).map((entry) => ({
      ...entry,
      best_weight_lb: Number(entry.best_weight_lb),
      best_reps: Number(entry.best_reps),
    })),
  }
}

export async function fetchLastSessionForExercise(exerciseId: string): Promise<LastSessionData> {
  const { data, error } = await supabase.rpc('get_last_session_for_exercise', {
    p_exercise_id: exerciseId,
  })
  if (error) throw error
  const result = data as LastSessionData | null
  return result ?? { sets: [], note: '', completed_at: null }
}
