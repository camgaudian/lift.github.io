import type { WeightUnit } from '@/lib/types'
import { formatSetSummary as formatSetSummaryWithUnit, formatVolume as formatVolumeWithUnit } from '@/lib/units'

export function formatVolume(lb: number, unit: WeightUnit = 'lb'): string {
  return formatVolumeWithUnit(lb, unit)
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseDuration(input: string): number {
  const parts = input.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return Number(input) * 60 || 0
}

export function epley1rm(weight: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function formatSetSummary(
  weight: number,
  reps: number,
  unit: WeightUnit = 'lb',
  addedWeight?: number | null,
): string {
  return formatSetSummaryWithUnit(weight, reps, unit, addedWeight)
}

export function formatSetsList(
  sets: { weight_lb: number; reps: number; added_weight_lb?: number | null }[],
  unit: WeightUnit = 'lb',
): string {
  return sets.map((s) => formatSetSummary(s.weight_lb, s.reps, unit, s.added_weight_lb)).join(', ')
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatExercisePreview(names: string[], maxVisible = 3): string {
  if (names.length === 0) return ''
  const visible = names.slice(0, maxVisible)
  return names.length > maxVisible ? `${visible.join(', ')}, ...` : visible.join(', ')
}
