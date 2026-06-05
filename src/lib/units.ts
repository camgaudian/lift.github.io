import type { WeightUnit } from '@/lib/types'

const LB_PER_KG = 2.2046226218

export function normalizeUnit(unit: string | null | undefined): WeightUnit {
  return unit === 'kg' ? 'kg' : 'lb'
}

export function lbToDisplay(lb: number, unit: WeightUnit): number {
  if (unit === 'kg') return Math.round((lb / LB_PER_KG) * 10) / 10
  return lb
}

export function displayToLb(value: number, unit: WeightUnit): number {
  if (unit === 'kg') return value * LB_PER_KG
  return value
}

export function formatWeight(lb: number, unit: WeightUnit): string {
  if (lb <= 0) return '—'
  if (unit === 'kg') {
    const kg = lb / LB_PER_KG
    const rounded = Math.round(kg * 10) / 10
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} kg`
  }
  return `${Math.round(lb).toLocaleString()} lb`
}

export function formatVolume(volumeLb: number, unit: WeightUnit): string {
  if (unit === 'kg') {
    const kg = volumeLb / LB_PER_KG
    if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M kg`
    if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}k kg`
    return `${Math.round(kg).toLocaleString()} kg`
  }
  if (volumeLb >= 1_000_000) return `${(volumeLb / 1_000_000).toFixed(1)}M lb`
  if (volumeLb >= 1_000) return `${(volumeLb / 1_000).toFixed(1)}k lb`
  return `${Math.round(volumeLb).toLocaleString()} lb`
}

export function formatSetSummary(
  weightLb: number,
  reps: number,
  unit: WeightUnit,
  addedWeightLb?: number | null,
): string {
  const total = weightLb + (addedWeightLb ?? 0)
  if (total > 0) return `${formatWeight(total, unit)}×${reps}`
  return `${reps} reps`
}
