import { useState } from 'react'
import { useExercises } from './useExercises'
import { createExercise, deleteExercise } from './exerciseApi'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import { capitalize } from '@/lib/format'
import type { ExerciseType } from '@/lib/types'

const CATEGORIES = ['push', 'pull', 'legs', 'core', 'cardio']
const TYPES: ExerciseType[] = ['strength', 'bodyweight', 'cardio']

export function ExercisesTab() {
  const { exercises, loading, error, reload } = useExercises()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [exerciseType, setExerciseType] = useState<ExerciseType>('strength')
  const [newCategory, setNewCategory] = useState('push')
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
        category: newCategory,
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

  if (loading) return <p className="text-text-secondary">Loading exercises…</p>
  if (error) return <p className="text-danger">{error}</p>

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search exercises…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`rounded-full px-3 py-1 text-sm ${!category ? 'bg-accent text-white' : 'bg-surface-secondary text-text-secondary'}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${category === c ? 'bg-accent text-white' : 'bg-surface-secondary text-text-secondary'}`}
          >
            {c}
          </button>
        ))}
      </div>

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
          <div>
            <label className="text-sm text-text-secondary">Category</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{capitalize(c)}</option>
              ))}
            </select>
          </div>
          <Input label="Muscles (comma-separated)" value={muscles} onChange={(e) => setMuscles(e.target.value)} />
          <Input label="Equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          <Button onClick={handleAdd} disabled={saving} fullWidth>Save exercise</Button>
        </Card>
      )}

      {custom.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-text-secondary">Your exercises</h3>
          <ExerciseList items={custom} onDelete={handleDelete} />
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">Built-in</h3>
        <ExerciseList items={builtin} />
      </section>
    </div>
  )
}

function ExerciseList({
  items,
  onDelete,
}: {
  items: { id: string; name: string; category: string; exercise_type: string; primary_muscles: string[]; equipment: string | null }[]
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
                {e.category} · {e.exercise_type}
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
      {items.length === 0 && <p className="text-sm text-text-secondary">No exercises found.</p>}
    </ul>
  )
}
