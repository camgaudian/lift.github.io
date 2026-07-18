import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatedListItem } from '@/components/AnimatedListItem'
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
import { ExerciseRemoveButton } from '@/components/ExerciseRemoveButton'
import { ExerciseSwapButton } from '@/components/ExerciseSwapButton'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ExercisePickerPanel } from '@/features/exercises/ExercisePicker'
import { useDragReorder, reorderList } from '@/lib/useDragReorder'
import { useListItemMotion } from '@/lib/useListItemMotion'
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
  const {
    motions: itemMotions,
    clearMotion,
    setBusy,
    setExiting,
    setSwapping,
    phaseOf,
  } = useListItemMotion<TemplateExercise>()
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
    if (itemMotions[itemId]) return
    setBusy(itemId)
    try {
      await removeExerciseFromTemplate(itemId)
      setExiting(itemId)
    } catch {
      clearMotion(itemId)
    }
  }

  const finishRemove = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    clearMotion(itemId)
  }

  const handleSwap = async (item: TemplateExercise, exerciseId: string) => {
    if (!id || itemMotions[item.id]) return
    const index = items.findIndex((i) => i.id === item.id)
    if (index < 0) return

    setBusy(item.id)
    try {
      await removeExerciseFromTemplate(item.id)
      const added = await addExerciseToTemplate(id, exerciseId, index)
      const orderedIds = items.map((i) => (i.id === item.id ? added.id : i.id))
      await reorderTemplateExercises(orderedIds)
      setSwapping(item.id, added)
    } catch {
      clearMotion(item.id)
    }
  }

  const finishSwap = (itemId: string, incoming: TemplateExercise) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? incoming : i)))
    clearMotion(itemId)
  }

  const templateItemLabel = (item: TemplateExercise) =>
    (item.exercise as { name: string } | undefined)?.name ?? 'Exercise'

  const renderTemplateCard = (item: TemplateExercise, idx: number) => (
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
        {idx + 1}. {templateItemLabel(item)}
      </span>
      <div className="flex shrink-0 items-center gap-0.5">
        <ExerciseSwapButton
          exerciseName={templateItemLabel(item)}
          exercises={exercises}
          excludeIds={alreadyAdded}
          onSwap={(exerciseId) => handleSwap(item, exerciseId)}
        />
        <ExerciseRemoveButton
          exerciseName={templateItemLabel(item)}
          fromLabel="template"
          onRemove={() => handleRemove(item.id)}
        />
      </div>
    </Card>
  )

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

      <div ref={listRef} className="flex flex-col">
        {items.map((item, idx) => {
          const motion = itemMotions[item.id]
          const incoming =
            motion?.phase === 'swapping' ? motion.incoming : undefined

          return (
            <AnimatedListItem
              key={item.id}
              data-drag-row
              phase={phaseOf(item.id)}
              spacingClassName="mb-2 last:mb-0"
              className={
                draggingKey === item.id
                  ? 'relative z-10'
                  : isDragging
                    ? 'transition-transform duration-150 ease-out'
                    : ''
              }
              style={getRowStyle(idx)}
              incoming={incoming ? renderTemplateCard(incoming, idx) : undefined}
              onAnimationComplete={() => {
                if (motion?.phase === 'exiting') {
                  finishRemove(item.id)
                } else if (motion?.phase === 'swapping') {
                  finishSwap(item.id, motion.incoming)
                }
              }}
            >
              {renderTemplateCard(item, idx)}
            </AnimatedListItem>
          )
        })}
      </div>
    </div>
  )
}
