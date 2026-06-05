import { useState } from 'react'
import { useExercises } from './useExercises'
import { createExercise, deleteExercise } from './exerciseApi'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { capitalize } from '@/lib/format'
import {
  EXERCISE_CATEGORIES,
  EXERCISE_FILTER_CATEGORIES,
  groupExercisesByCategory,
} from '@/lib/exerciseCategories'
import type { Exercise, ExerciseType } from '@/lib/types'

const TYPES: ExerciseType[] = ['strength', 'bodyweight', 'cardio']

type ExerciseItem = Pick<
  Exercise,
  'id' | 'name' | 'category' | 'exercise_type' | 'primary_muscles' | 'equipment'
>

export function ExercisesTab() {
  const { exercises, loading, error, reload } = useExercises()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [exerciseType, setExerciseType] = useState<ExerciseType>('strength')
  const [newCategory, setNewCategory] = useState(EXERCISE_CATEGORIES[0])
  const [muscles, setMuscles] = useState('')
  const [equipment, setEquipment] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = exercises.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !category || e.category === category
    return matchSearch && matchCat
  })

  const builtin = filtered.filter((e) => !e.user_id)
  const custom = filtered.filter((e) => e.user_id)

  const handleAdd = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createExercise({
        name: name.trim(),
        exercise_type: exerciseType,
        category: exerciseType === 'cardio' ? 'cardio' : newCategory,
        primary_muscles: muscles.split(',').map((m) => m.trim()).filter(Boolean),
        equipment: equipment || undefined,
      })
      setName('')
      setMuscles('')
      setEquipment('')
      setShowAdd(false)
      reload()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this custom exercise?')) return
    await deleteExercise(id)
    reload()
  }

  if (loading) return <LoadingSpinner size="section" />
  if (error) return <p className="text-danger">{error}</p>

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search exercises…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 capitalize"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">All categories</option>
        {EXERCISE_FILTER_CATEGORIES.map((c) => (
          <option key={c} value={c}>{capitalize(c)}</option>
        ))}
      </select>

      <Button variant="secondary" fullWidth onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? 'Cancel' : '+ Add custom exercise'}
      </Button>

      {showAdd && (
        <Card className="flex flex-col gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div>
            <label className="text-sm text-text-secondary">Type</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3"
              value={exerciseType}
              onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{capitalize(t)}</option>
              ))}
            </select>
          </div>
          {exerciseType !== 'cardio' && (
            <div>
              <label className="text-sm text-text-secondary">Category</label>
              <select
                className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
              >
                {EXERCISE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{capitalize(c)}</option>
                ))}
              </select>
            </div>
          )}
          <Input label="Muscles (comma-separated)" value={muscles} onChange={(e) => setMuscles(e.target.value)} />
          <Input label="Equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          <Button onClick={handleAdd} disabled={saving} fullWidth>Save exercise</Button>
        </Card>
      )}

      {custom.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-text-secondary">Your exercises</h3>
          <GroupedExerciseList
            groups={groupExercisesByCategory(custom)}
            showGroupHeaders={!category}
            onDelete={handleDelete}
          />
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">Built-in</h3>
        <GroupedExerciseList groups={groupExercisesByCategory(builtin)} showGroupHeaders={!category} />
      </section>
    </div>
  )
}

function GroupedExerciseList({
  groups,
  showGroupHeaders,
  onDelete,
}: {
  groups: { category: string; items: ExerciseItem[] }[]
  showGroupHeaders: boolean
  onDelete?: (id: string) => void
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-text-secondary">No exercises found.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ category, items }) => (
        <section key={category}>
          {showGroupHeaders && (
            <h4 className="mb-2 text-sm font-semibold capitalize">{category}</h4>
          )}
          <ExerciseList items={items} onDelete={onDelete} />
        </section>
      ))}
    </div>
  )
}

function ExerciseList({
  items,
  onDelete,
}: {
  items: ExerciseItem[]
  onDelete?: (id: string) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((e) => (
        <li key={e.id}>
          <Card padding="sm" className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">{e.name}</p>
              <p className="text-xs text-text-secondary capitalize">
                {e.exercise_type}
                {e.equipment ? ` · ${e.equipment}` : ''}
              </p>
            </div>
            {onDelete && (
              <button type="button" onClick={() => onDelete(e.id)} className="text-sm text-danger">
                Delete
              </button>
            )}
          </Card>
        </li>
      ))}
    </ul>
  )
}
