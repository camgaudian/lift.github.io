import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchTemplateWithExercises,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  updateTemplateName,
  reorderTemplateExercises,
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
import { useDragReorder, reorderList } from '@/lib/useDragReorder'
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
  const savedNameRef = useRef('')

  const reload = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { template, exercises: ex } = await fetchTemplateWithExercises(id)
      setName(template.name)
      savedNameRef.current = template.name
      setItems(ex)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [id])

  const commitName = async () => {
    if (!id) return
    const trimmed = name.trim()
    if (!trimmed) {
      setName(savedNameRef.current)
      return
    }
    if (trimmed === savedNameRef.current) {
      if (trimmed !== name) setName(trimmed)
      return
    }
    setName(trimmed)
    savedNameRef.current = trimmed
    await updateTemplateName(id, trimmed)
  }

  const handleReorder = (from: number, to: number) => {
    const next = reorderList(items, from, to)
    setItems(next)
    void reorderTemplateExercises(next.map((i) => i.id))
  }

  const { listRef, draggingKey, isDragging, startDrag, getRowStyle } = useDragReorder({
    keys: items.map((i) => i.id),
    onReorder: handleReorder,
  })

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
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        aria-label="Template name"
        placeholder="Template name"
        className="w-full rounded-xl border border-transparent bg-transparent px-2 -mx-2 py-1 text-2xl font-semibold text-text placeholder:text-text-secondary hover:border-border focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
      />

      <Button fullWidth onClick={() => navigate(`/workout?template=${id}`)}>
        Start workout from template
      </Button>

      <Button variant="secondary" fullWidth onClick={handleTogglePicker}>
        {showPicker ? 'Cancel' : '+ Add exercise'}
      </Button>

      {showPicker && (
        <Card className="flex flex-col gap-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M11 11l3 3" strokeLinecap="round" />
            </svg>
            <Input
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <ExercisePickerResults
            exercises={filtered}
            isSearching={isSearching}
            showGroupHeaders={!category && !isSearching}
            disabled={adding}
            onSelect={handleAddExercise}
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
        </Card>
      )}

      <div ref={listRef} className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div
            key={item.id}
            data-drag-row
            className={
              draggingKey === item.id
                ? 'relative z-10'
                : isDragging
                  ? 'transition-transform duration-150 ease-out'
                  : ''
            }
            style={getRowStyle(idx)}
          >
            <Card
              padding="sm"
              className={[
                'flex items-center gap-1',
                draggingKey === item.id ? 'shadow-lg ring-1 ring-accent/40' : '',
              ].join(' ')}
            >
              <button
                type="button"
                onPointerDown={(e) => startDrag(idx, e)}
                className="flex shrink-0 touch-none select-none cursor-grab active:cursor-grabbing text-text-secondary pr-1 py-1"
                style={{ touchAction: 'none' }}
                aria-label={`Reorder exercise ${idx + 1}`}
              >
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden>
                  <circle cx="3" cy="3" r="1.5" />
                  <circle cx="9" cy="3" r="1.5" />
                  <circle cx="3" cy="8" r="1.5" />
                  <circle cx="9" cy="8" r="1.5" />
                  <circle cx="3" cy="13" r="1.5" />
                  <circle cx="9" cy="13" r="1.5" />
                </svg>
              </button>
              <span className="flex-1">
                {idx + 1}. {(item.exercise as { name: string } | undefined)?.name ?? 'Exercise'}
              </span>
              <button type="button" onClick={() => handleRemove(item.id)} className="shrink-0 text-sm text-danger">
                Remove
              </button>
            </Card>
          </div>
        ))}
      </div>
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
