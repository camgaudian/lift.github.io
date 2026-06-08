import { format, parseISO } from 'date-fns'
import {
  MILESTONE_CATEGORIES,
  getCategoryValue,
  getMilestoneProgress,
  type MilestoneStatSnapshot,
} from '@/lib/milestones'
import { computeWorkoutFunStats, fetchMilestoneStats, type MilestoneStats } from '@/lib/stats'
import { supabase } from '@/lib/supabase'
import type { MilestoneCategoryId, WorkoutExercise } from '@/lib/types'

export interface NewMilestone {
  categoryId: MilestoneCategoryId
  tierIndex: number
  categoryName: string
  tierLabel: string
}

export interface NewPr {
  exerciseId: string
  exerciseName: string
  weightLb: number
  reps: number
}

export interface WorkoutAchievements {
  milestones: NewMilestone[]
  prs: NewPr[]
}

interface ExerciseBest {
  weightLb: number
  reps: number
}

function setWeight(set: { weight_lb: number; added_weight_lb: number | null }): number {
  return set.weight_lb + (set.added_weight_lb ?? 0)
}

function isBetterSet(candidate: ExerciseBest, current: ExerciseBest | undefined): boolean {
  if (!current) return true
  if (candidate.weightLb > current.weightLb) return true
  if (candidate.weightLb === current.weightLb && candidate.reps > current.reps) return true
  return false
}

function getWorkoutBestSets(exercises: WorkoutExercise[]): Map<string, ExerciseBest & { exerciseName: string }> {
  const bests = new Map<string, ExerciseBest & { exerciseName: string }>()

  for (const exercise of exercises) {
    if (exercise.exercise_type !== 'strength' && exercise.exercise_type !== 'bodyweight') continue

    const exerciseName = (exercise.exercise as { name: string } | undefined)?.name ?? 'Exercise'

    for (const set of exercise.strength_sets ?? []) {
      if (set.is_warmup || set.reps <= 0) continue

      const candidate = {
        weightLb: setWeight(set),
        reps: set.reps,
        exerciseName,
      }

      const current = bests.get(exercise.exercise_id)
      if (isBetterSet(candidate, current)) {
        bests.set(exercise.exercise_id, candidate)
      }
    }
  }

  return bests
}

async function fetchExerciseBestsExcludingWorkout(
  excludeWorkoutId: string,
): Promise<Map<string, ExerciseBest>> {
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      id,
      workout_exercises (
        exercise_id,
        exercise_type,
        strength_sets (
          reps,
          weight_lb,
          added_weight_lb,
          is_warmup
        )
      )
    `)
    .eq('status', 'completed')
    .neq('id', excludeWorkoutId)

  if (error) throw error

  const bests = new Map<string, ExerciseBest>()

  for (const workout of data ?? []) {
    for (const exercise of workout.workout_exercises ?? []) {
      if (exercise.exercise_type !== 'strength' && exercise.exercise_type !== 'bodyweight') continue

      for (const set of exercise.strength_sets ?? []) {
        if (set.is_warmup || set.reps <= 0) continue

        const candidate = {
          weightLb: setWeight(set),
          reps: set.reps,
        }

        const current = bests.get(exercise.exercise_id)
        if (isBetterSet(candidate, current)) {
          bests.set(exercise.exercise_id, candidate)
        }
      }
    }
  }

  return bests
}

function computeLongestStreakDays(completedAts: (string | null | undefined)[]): number {
  const days = [
    ...new Set(
      completedAts
        .filter((iso): iso is string => Boolean(iso))
        .map((iso) => format(parseISO(iso), 'yyyy-MM-dd')),
    ),
  ].sort()

  if (days.length === 0) return 0

  const dates = days.map((day) => parseISO(day))
  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const dayDiff = Math.round(
      (dates[i].getTime() - dates[i - 1].getTime()) / (24 * 60 * 60 * 1000),
    )
    if (dayDiff === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}

async function fetchLongestStreakExcludingWorkout(excludeWorkoutId: string): Promise<number> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)

  if (error) throw error

  const completedAts = (data ?? [])
    .filter((workout) => workout.id !== excludeWorkoutId)
    .map((workout) => workout.completed_at)

  return computeLongestStreakDays(completedAts)
}

function workoutStatsContribution(exercises: WorkoutExercise[]): MilestoneStatSnapshot {
  const fun = computeWorkoutFunStats(exercises)
  return {
    cumulative_volume_lb: fun.volume_lb,
    total_workouts: 1,
    total_sets: fun.total_sets,
    total_reps: fun.total_reps,
    total_cardio_seconds: fun.total_cardio_seconds,
    longest_streak_days: 0,
  }
}

function subtractWorkoutFromStats(
  after: MilestoneStats,
  contribution: MilestoneStatSnapshot,
  longestStreakExcluding: number,
): MilestoneStats {
  return {
    cumulative_volume_lb: Math.max(0, after.cumulative_volume_lb - contribution.cumulative_volume_lb),
    total_workouts: Math.max(0, after.total_workouts - contribution.total_workouts),
    total_sets: Math.max(0, after.total_sets - contribution.total_sets),
    total_reps: Math.max(0, after.total_reps - contribution.total_reps),
    total_cardio_seconds: Math.max(0, after.total_cardio_seconds - contribution.total_cardio_seconds),
    longest_streak_days: longestStreakExcluding,
  }
}

function detectNewMilestones(before: MilestoneStatSnapshot, after: MilestoneStatSnapshot): NewMilestone[] {
  const unlocked: NewMilestone[] = []

  for (const category of MILESTONE_CATEGORIES) {
    const beforeProgress = getMilestoneProgress(getCategoryValue(before, category.id), category)
    const afterProgress = getMilestoneProgress(getCategoryValue(after, category.id), category)

    for (let tier = beforeProgress.tierIndex + 1; tier <= afterProgress.tierIndex; tier++) {
      unlocked.push({
        categoryId: category.id,
        tierIndex: tier,
        categoryName: category.name,
        tierLabel: category.tiers[tier]?.label ?? `Tier ${tier + 1}`,
      })
    }
  }

  return unlocked
}

function detectNewPrs(
  exercises: WorkoutExercise[],
  previousBests: Map<string, ExerciseBest>,
): NewPr[] {
  const workoutBests = getWorkoutBestSets(exercises)
  const prs: NewPr[] = []

  for (const [exerciseId, best] of workoutBests) {
    const previous = previousBests.get(exerciseId)
    if (!isBetterSet(best, previous)) continue

    prs.push({
      exerciseId,
      exerciseName: best.exerciseName,
      weightLb: best.weightLb,
      reps: best.reps,
    })
  }

  return prs.sort((a, b) => b.weightLb - a.weightLb || b.reps - a.reps)
}

export async function fetchWorkoutAchievements(
  workoutId: string,
  exercises: WorkoutExercise[],
): Promise<WorkoutAchievements> {
  const [afterStats, previousBests, longestStreakExcluding] = await Promise.all([
    fetchMilestoneStats(),
    fetchExerciseBestsExcludingWorkout(workoutId),
    fetchLongestStreakExcludingWorkout(workoutId),
  ])

  const contribution = workoutStatsContribution(exercises)
  const beforeStats = subtractWorkoutFromStats(afterStats, contribution, longestStreakExcluding)

  return {
    milestones: detectNewMilestones(beforeStats, afterStats),
    prs: detectNewPrs(exercises, previousBests),
  }
}

export function formatAchievementsSummary(achievements: WorkoutAchievements): string | null {
  const milestoneCount = achievements.milestones.length
  const prCount = achievements.prs.length
  if (milestoneCount === 0 && prCount === 0) return null

  const parts: string[] = []
  if (prCount > 0) {
    parts.push(`${prCount} new PR${prCount === 1 ? '' : 's'}`)
  }
  if (milestoneCount > 0) {
    parts.push(`${milestoneCount} milestone${milestoneCount === 1 ? '' : 's'} unlocked`)
  }

  return `${parts.join(' & ')}!`
}

export function hasWorkoutAchievements(achievements: WorkoutAchievements | null | undefined): boolean {
  if (!achievements) return false
  return achievements.milestones.length > 0 || achievements.prs.length > 0
}
