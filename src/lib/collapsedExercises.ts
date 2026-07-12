const storageKey = (workoutId: string) => `lift:collapsed-exercises:${workoutId}`

export function getCollapsedExerciseIds(workoutId: string): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(storageKey(workoutId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function saveCollapsedExerciseIds(workoutId: string, ids: Set<string>): void {
  if (typeof localStorage === 'undefined') return
  if (ids.size === 0) {
    localStorage.removeItem(storageKey(workoutId))
    return
  }
  localStorage.setItem(storageKey(workoutId), JSON.stringify([...ids]))
}

export function clearCollapsedExercises(workoutId: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(storageKey(workoutId))
}

export function removeCollapsedExercise(workoutId: string, exerciseId: string): void {
  const ids = getCollapsedExerciseIds(workoutId)
  if (!ids.delete(exerciseId)) return
  saveCollapsedExerciseIds(workoutId, ids)
}
