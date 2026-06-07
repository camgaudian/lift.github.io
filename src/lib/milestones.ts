import { formatVolume } from '@/lib/format'
import type { MilestoneCategoryId, WeightUnit } from '@/lib/types'

export type { MilestoneCategoryId }

export interface MilestoneTier {
  threshold: number
  label: string
}

export interface MilestoneCategory {
  id: MilestoneCategoryId
  name: string
  tiers: MilestoneTier[]
}

const HOUR = 3600
const DAY = 86400

export const MILESTONE_CATEGORIES: MilestoneCategory[] = [
  {
    id: 'weight',
    name: 'Weight moved',
    tiers: [
      { threshold: 50_000, label: '50K lbs' },
      { threshold: 100_000, label: '100K lbs' },
      { threshold: 250_000, label: '250K lbs' },
      { threshold: 500_000, label: '500K lbs' },
      { threshold: 1_000_000, label: '1M lbs' },
      { threshold: 2_500_000, label: '2.5M lbs' },
      { threshold: 5_000_000, label: '5M lbs' },
    ],
  },
  {
    id: 'workouts',
    name: 'Workouts',
    tiers: [
      { threshold: 5, label: '5 workouts' },
      { threshold: 10, label: '10 workouts' },
      { threshold: 25, label: '25 workouts' },
      { threshold: 50, label: '50 workouts' },
      { threshold: 100, label: '100 workouts' },
      { threshold: 250, label: '250 workouts' },
      { threshold: 500, label: '500 workouts' },
    ],
  },
  {
    id: 'sets',
    name: 'Sets',
    tiers: [
      { threshold: 50, label: '50 sets' },
      { threshold: 100, label: '100 sets' },
      { threshold: 250, label: '250 sets' },
      { threshold: 500, label: '500 sets' },
      { threshold: 1_000, label: '1K sets' },
      { threshold: 2_500, label: '2.5K sets' },
      { threshold: 5_000, label: '5K sets' },
    ],
  },
  {
    id: 'reps',
    name: 'Reps',
    tiers: [
      { threshold: 500, label: '500 reps' },
      { threshold: 1_000, label: '1K reps' },
      { threshold: 2_500, label: '2.5K reps' },
      { threshold: 5_000, label: '5K reps' },
      { threshold: 10_000, label: '10K reps' },
      { threshold: 25_000, label: '25K reps' },
      { threshold: 50_000, label: '50K reps' },
    ],
  },
  {
    id: 'cardio',
    name: 'Cardio time',
    tiers: [
      { threshold: 3 * HOUR, label: '3 hours' },
      { threshold: 5 * HOUR, label: '5 hours' },
      { threshold: 10 * HOUR, label: '10 hours' },
      { threshold: 1 * DAY, label: '1 day' },
      { threshold: 3 * DAY, label: '3 days' },
      { threshold: 5 * DAY, label: '5 days' },
      { threshold: 10 * DAY, label: '10 days' },
    ],
  },
  {
    id: 'streak',
    name: 'Longest streak',
    tiers: [
      { threshold: 3, label: '3 days' },
      { threshold: 5, label: '5 days' },
      { threshold: 7, label: '7 days' },
      { threshold: 10, label: '10 days' },
      { threshold: 15, label: '15 days' },
      { threshold: 20, label: '20 days' },
      { threshold: 30, label: '1 month' },
    ],
  },
]

export interface MilestoneProgress {
  tierIndex: number
  currentTier: MilestoneTier | null
  nextTier: MilestoneTier | null
}

export function getMilestoneProgress(value: number, category: MilestoneCategory): MilestoneProgress {
  let tierIndex = -1
  for (let i = 0; i < category.tiers.length; i++) {
    if (value >= category.tiers[i].threshold) tierIndex = i
    else break
  }

  return {
    tierIndex,
    currentTier: tierIndex >= 0 ? category.tiers[tierIndex] : null,
    nextTier: tierIndex < category.tiers.length - 1 ? category.tiers[tierIndex + 1] : null,
  }
}

export interface MilestoneStatSnapshot {
  cumulative_volume_lb: number
  total_workouts: number
  total_sets: number
  total_reps: number
  total_cardio_seconds: number
  longest_streak_days: number
}

export function getCategoryValue(
  stats: MilestoneStatSnapshot,
  id: MilestoneCategoryId,
): number {
  switch (id) {
    case 'weight':
      return stats.cumulative_volume_lb
    case 'workouts':
      return stats.total_workouts
    case 'sets':
      return stats.total_sets
    case 'reps':
      return stats.total_reps
    case 'cardio':
      return stats.total_cardio_seconds
    case 'streak':
      return stats.longest_streak_days
  }
}

export function getMilestoneCategory(id: MilestoneCategoryId): MilestoneCategory {
  const category = MILESTONE_CATEGORIES.find((entry) => entry.id === id)
  if (!category) throw new Error(`Unknown milestone category: ${id}`)
  return category
}

export function isMilestoneCategoryId(value: string | null | undefined): value is MilestoneCategoryId {
  return Boolean(value && MILESTONE_CATEGORIES.some((entry) => entry.id === value))
}

export function formatMilestoneValue(
  categoryId: MilestoneCategoryId,
  value: number,
  unit: WeightUnit = 'lb',
): string {
  switch (categoryId) {
    case 'weight':
      return formatVolume(value, unit)
    case 'cardio':
      return formatCardioTotal(value)
    case 'streak':
      return value === 1 ? '1 day' : `${value} days`
    default:
      return value.toLocaleString()
  }
}

function formatCardioTotal(seconds: number): string {
  const days = Math.floor(seconds / DAY)
  const hours = Math.floor((seconds % DAY) / HOUR)
  const minutes = Math.floor((seconds % HOUR) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
