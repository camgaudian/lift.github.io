export function formatVolume(lb: number): string {
  if (lb >= 1_000_000) return `${(lb / 1_000_000).toFixed(1)}M lb`
  if (lb >= 1_000) return `${(lb / 1_000).toFixed(1)}k lb`
  return `${Math.round(lb).toLocaleString()} lb`
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

export function formatSetSummary(weight: number, reps: number, addedWeight?: number | null): string {
  const total = weight + (addedWeight ?? 0)
  if (total > 0) return `${total}×${reps}`
  return `${reps} reps`
}

export function formatSetsList(sets: { weight_lb: number; reps: number; added_weight_lb?: number | null }[]): string {
  return sets.map((s) => formatSetSummary(s.weight_lb, s.reps, s.added_weight_lb)).join(', ')
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
