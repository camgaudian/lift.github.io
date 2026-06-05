export const EXERCISE_CATEGORIES = [
  'arms',
  'chest',
  'shoulders',
  'back',
  'core',
  'legs',
] as const

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number]

export const EXERCISE_FILTER_CATEGORIES = [...EXERCISE_CATEGORIES, 'cardio'] as const

export function groupExercisesByCategory<T extends { category: string; name: string }>(
  items: T[],
) {
  const groups: { category: string; items: T[] }[] = []

  for (const category of EXERCISE_FILTER_CATEGORIES) {
    const categoryItems = items
      .filter((e) => e.category === category)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (categoryItems.length > 0) {
      groups.push({ category, items: categoryItems })
    }
  }

  const known = new Set<string>(EXERCISE_FILTER_CATEGORIES)
  const other = items
    .filter((e) => !known.has(e.category))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (other.length > 0) {
    groups.push({ category: 'other', items: other })
  }

  return groups
}
