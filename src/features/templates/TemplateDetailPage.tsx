import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
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
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ExercisePickerPanel } from '@/features/exercises/ExercisePicker'
import { useDragReorder, reorderList } from '@/lib/useDragReorder'
import type { TemplateExercise } from '@/lib/types'

export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { exercises } = useExercises()
  const [name, setName] = useState('')
  const [items, setItems] = useState<TemplateExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
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

  const handleAddExercise = async (exerciseId: string) => {
    if (!id || adding) return
    setAdding(true)
    try {
      await addExerciseToTemplate(id, exerciseId, items.length)
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
      <div className="flex items-center gap-3">
        <BackButton to="/library" label="Back to library" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          aria-label="Template name"
          placeholder="Template name"
          className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 -mx-2 py-1 text-2xl font-semibold text-text placeholder:text-text-secondary hover:border-border focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <Button fullWidth onClick={() => navigate(`/?template=${id}`)}>
        Start workout from template
      </Button>

      <Button variant="secondary" fullWidth onClick={() => setShowPicker(!showPicker)}>
        {showPicker ? 'Cancel' : '+ Add exercise'}
      </Button>

      {showPicker && (
        <ExercisePickerPanel
          exercises={exercises}
          excludeIds={alreadyAdded}
          onSelect={handleAddExercise}
          disabled={adding}
        />
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
