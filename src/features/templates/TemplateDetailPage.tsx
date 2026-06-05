import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchTemplateWithExercises,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
} from './templateApi'
import { useExercises } from '@/features/exercises/useExercises'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { capitalize } from '@/lib/format'
import {
  EXERCISE_FILTER_CATEGORIES,
  groupExercisesByCategory,
} from '@/lib/exerciseCategories'
import type { Exercise, TemplateExercise } from '@/lib/types'

export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { exercises } = useExercises()
  const [name, setName] = useState('')
  const [items, setItems] = useState<TemplateExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [adding, setAdding] = useState(false)

  const reload = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { template, exercises: ex } = await fetchTemplateWithExercises(id)
      setName(template.name)
      setItems(ex)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [id])

  const alreadyAdded = new Set(items.map((i) => i.exercise_id))

  const available = exercises.filter((e) => !alreadyAdded.has(e.id))
  const filtered = available.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !category || e.category === category
    return matchSearch && matchCat
  })

  const isSearching = search.trim().length > 0

  const resetPicker = () => {
    setSearch('')
    setCategory('')
  }

  const handleTogglePicker = () => {
    if (showPicker) resetPicker()
    setShowPicker(!showPicker)
  }

  const handleAddExercise = async (exerciseId: string) => {
    if (!id || adding) return
    setAdding(true)
    try {
      await addExerciseToTemplate(id, exerciseId, items.length)
      resetPicker()
      setShowPicker(false)
      reload()
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (itemId: string) => {
    await removeExerciseFromTemplate(itemId)
    reload()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-4">
      <Link to="/library" className="text-sm text-accent">← Library</Link>
      <h1 className="text-2xl font-semibold">{name}</h1>

      <Button fullWidth onClick={() => navigate(`/workout?template=${id}`)}>
        Start workout from template
      </Button>

      <Button variant="secondary" fullWidth onClick={handleTogglePicker}>
        {showPicker ? 'Cancel' : '+ Add exercise'}
      </Button>

      {showPicker && (
        <Card className="flex flex-col gap-3">
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

          <ExercisePickerResults
            exercises={filtered}
            isSearching={isSearching}
            showGroupHeaders={!category && !isSearching}
            disabled={adding}
            onSelect={handleAddExercise}
          />

          <Input
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <li key={item.id}>
            <Card padding="sm" className="flex justify-between items-center">
              <span>
                {idx + 1}. {(item.exercise as { name: string } | undefined)?.name ?? 'Exercise'}
              </span>
              <button type="button" onClick={() => handleRemove(item.id)} className="text-sm text-danger">
                Remove
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
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
