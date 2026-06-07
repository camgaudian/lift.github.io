import { useState } from 'react'
import { Card } from '@/components/Card'
import { SearchInput } from '@/components/SearchInput'
import { capitalize } from '@/lib/format'
import {
  EXERCISE_FILTER_CATEGORIES,
  groupExercisesByCategory,
} from '@/lib/exerciseCategories'
import type { Exercise } from '@/lib/types'

export function ExercisePickerPanel({
  exercises,
  excludeIds,
  onSelect,
  disabled = false,
}: {
  exercises: Exercise[]
  excludeIds?: Iterable<string>
  onSelect: (exerciseId: string) => void
  disabled?: boolean
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const excluded = excludeIds ? new Set(excludeIds) : new Set<string>()
  const available = exercises.filter((e) => !excluded.has(e.id))
  const filtered = available.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !category || e.category === category
    return matchSearch && matchCat
  })

  const isSearching = search.trim().length > 0

  return (
    <Card className="flex flex-col gap-3">
      <SearchInput
        placeholder="Search exercises…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ExercisePickerResults
        exercises={filtered}
        isSearching={isSearching}
        showGroupHeaders={!category && !isSearching}
        disabled={disabled}
        onSelect={onSelect}
      />

      <select
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 capitalize"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">All categories</option>
        {EXERCISE_FILTER_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {capitalize(c)}
          </option>
        ))}
      </select>
    </Card>
  )
}

function ExercisePickerResults({
  exercises,
  isSearching,
  showGroupHeaders,
  disabled,
  onSelect,
}: {
  exercises: Exercise[]
  isSearching: boolean
  showGroupHeaders: boolean
  disabled: boolean
  onSelect: (id: string) => void
}) {
  if (exercises.length === 0) {
    return (
      <p className="text-sm text-text-secondary py-2">
        {isSearching ? 'No exercises match your search' : 'No exercises available'}
      </p>
    )
  }

  const groups = showGroupHeaders
    ? groupExercisesByCategory(exercises)
    : [{ category: '', items: exercises }]

  return (
    <div className="max-h-64 overflow-y-auto flex flex-col gap-2 -mx-1 px-1">
      {groups.map(({ category, items }) => (
        <div key={category || 'all'}>
          {showGroupHeaders && category && (
            <p className="mb-1 text-xs font-semibold text-text-secondary capitalize sticky top-0 bg-surface py-1">
              {category}
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {items.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(e.id)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-secondary disabled:opacity-50"
                >
                  {e.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
