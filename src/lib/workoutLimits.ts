const MAX_REPS = 100
const MAX_WEIGHT_LB = 2000

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampReps(value: number): number {
  if (!Number.isFinite(value)) return 0
  return clamp(Math.floor(value), 0, MAX_REPS)
}

export function clampWeightLb(lb: number): number {
  if (!Number.isFinite(lb)) return 0
  return Math.round(clamp(lb, 0, MAX_WEIGHT_LB) * 100) / 100
}
