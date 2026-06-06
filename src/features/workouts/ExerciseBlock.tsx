import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { fetchLastSessionForExercise } from '@/lib/stats'
import { useProfile } from '@/contexts/ProfileContext'
import { formatSetsList } from '@/lib/format'
import { displayToLb, lbToDisplay } from '@/lib/units'
import { useDragReorder, reorderList } from '@/lib/useDragReorder'
import type { ExerciseType, LastSessionData, StrengthSet } from '@/lib/types'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import {
  upsertStrengthSets,
  upsertCardioEntry,
  upsertSessionNote,
  removeWorkoutExercise,
} from './workoutApi'
import { formatDuration, parseDuration } from '@/lib/format'

export interface ExerciseBlockHandle {
  save: () => Promise<void>
}

interface ExerciseBlockProps {
  workoutExerciseId: string
  exerciseId: string
  exerciseName: string
  exerciseType: ExerciseType
  initialSets?: StrengthSet[]
  initialNote?: string
  initialCardio?: { duration_seconds: number; distance_miles: number | null; calories: number | null }
  onRemove?: () => void
  readOnly?: boolean
}

type SetRow = StrengthSet & { rowKey: string; lastPlaceholderIndex?: number }

function hasSetData(set: StrengthSet): boolean {
  return set.reps > 0 || set.weight_lb > 0 || (set.added_weight_lb ?? 0) > 0
}

function reorderSets(sets: SetRow[], from: number, to: number): SetRow[] {
  return reorderList(sets, from, to).map((set, index) => ({
    ...set,
    set_number: index + 1,
  }))
}

function toSetRows(sets: StrengthSet[], nextRowKey: () => string): SetRow[] {
  return sets.map((set, index) => ({
    ...set,
    rowKey: nextRowKey(),
    lastPlaceholderIndex: index,
  }))
}

function resolveSetsForSave(
  sets: SetRow[],
  lastSession: LastSessionData | null,
): Omit<StrengthSet, 'id' | 'workout_exercise_id'>[] {
  return sets
    .filter(hasSetData)
    .map((set, index) => {
      const last = lastSession?.sets?.[set.lastPlaceholderIndex ?? index]
      return {
        set_number: index + 1,
        reps: set.reps > 0 ? set.reps : (last?.reps ?? 0),
        weight_lb: set.weight_lb > 0 ? set.weight_lb : (last?.weight_lb ?? 0),
        added_weight_lb: set.added_weight_lb ?? last?.added_weight_lb ?? null,
        is_warmup: set.is_warmup,
      }
    })
    .filter((set) => set.reps > 0)
}

export const ExerciseBlock = forwardRef<ExerciseBlockHandle, ExerciseBlockProps>(function ExerciseBlock(
  {
    workoutExerciseId,
    exerciseId,
    exerciseName,
    exerciseType,
    initialSets = [],
    initialNote = '',
    initialCardio,
    onRemove,
    readOnly = false,
  },
  ref,
) {
  const { unit } = useProfile()
  const rowKeyRef = useRef(0)
  const nextRowKey = () => String(++rowKeyRef.current)

  const [lastSession, setLastSession] = useState<LastSessionData | null>(null)
  const [note, setNote] = useState(initialNote)
  const [sets, setSets] = useState<SetRow[]>(() =>
    initialSets.length > 0
      ? toSetRows(initialSets, nextRowKey)
      : [{
          rowKey: nextRowKey(),
          set_number: 1,
          reps: 0,
          weight_lb: 0,
          added_weight_lb: null,
          is_warmup: false,
          lastPlaceholderIndex: 0,
        }],
  )
  const [duration, setDuration] = useState(
    initialCardio ? formatDuration(initialCardio.duration_seconds) : '20:00',
  )
  const [distance, setDistance] = useState(String(initialCardio?.distance_miles ?? ''))
  const [calories, setCalories] = useState(String(initialCardio?.calories ?? ''))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetchLastSessionForExercise(exerciseId).then(setLastSession)
  }, [exerciseId])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [saved])

  useEffect(() => {
    setNote(initialNote)
  }, [initialNote])

  useEffect(() => {
    if (initialSets.length > 0) {
      setSets(toSetRows(initialSets, nextRowKey))
    }
  }, [initialSets])

  const lastSetsSummary =
    lastSession?.sets?.length ? formatSetsList(lastSession.sets, unit) : null

  const placeholderFromLast = (set: SetRow, field: 'weight' | 'reps' | 'added') => {
    const s = lastSession?.sets?.[set.lastPlaceholderIndex ?? -1]
    if (!s) return undefined
    if (field === 'weight') {
      const w = s.weight_lb
      return w > 0 ? String(lbToDisplay(w, unit)) : undefined
    }
    if (field === 'added') {
      const w = s.added_weight_lb ?? 0
      return w > 0 ? String(lbToDisplay(w, unit)) : undefined
    }
    return s.reps > 0 ? String(s.reps) : undefined
  }

  const weightInputValue = (lb: number) => (lb > 0 ? lbToDisplay(lb, unit) : '')

  const handleWeightInput = (raw: string, onUpdate: (lb: number) => void) => {
    if (!raw) {
      onUpdate(0)
      return
    }
    onUpdate(displayToLb(Number(raw), unit))
  }

  const saveStrength = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      await upsertStrengthSets(workoutExerciseId, resolveSetsForSave(sets, lastSession))
      await upsertSessionNote(workoutExerciseId, note)
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const saveCardio = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      await upsertCardioEntry(workoutExerciseId, {
        duration_seconds: parseDuration(duration),
        distance_miles: distance ? Number(distance) : null,
        calories: calories ? Number(calories) : null,
      })
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const save = exerciseType === 'cardio' ? saveCardio : saveStrength

  useImperativeHandle(ref, () => ({ save }), [save])

  const saveButtonLabel = (defaultLabel: string) => {
    if (saving) return 'Saving…'
    if (saved) return '✓ Saved'
    return defaultLabel
  }

  const addSet = () => {
    setSets((prev) => [
      ...prev,
      {
        rowKey: nextRowKey(),
        set_number: prev.length + 1,
        reps: 0,
        weight_lb: 0,
        added_weight_lb: null,
        is_warmup: false,
        lastPlaceholderIndex: prev.length,
      },
    ])
  }

  const removeSet = (index: number) => {
    setSets((prev) => {
      if (prev.length <= 1) return prev
      return prev
        .filter((_, i) => i !== index)
        .map((set, i) => ({ ...set, set_number: i + 1 }))
    })
  }

  const updateSet = (index: number, field: keyof StrengthSet, value: number | boolean | null) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  const { listRef: setListRef, draggingKey, isDragging, startDrag, getRowStyle } = useDragReorder({
    keys: sets.map((set) => set.rowKey),
    disabled: readOnly,
    onReorder: (from, to) =>
      setSets((prev) => reorderSets(prev, from, to)),
  })

  const saveButton = (defaultLabel: string, onSave: () => Promise<void>) => (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        onClick={onSave}
        disabled={saving}
        className={saved ? 'pointer-events-none' : ''}
      >
        {saveButtonLabel(defaultLabel)}
      </Button>
      {saveError && <p className="text-sm text-danger text-center">{saveError}</p>}
    </div>
  )

  if (exerciseType === 'cardio') {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold">{exerciseName}</h3>
          {!readOnly && onRemove && (
            <button type="button" onClick={onRemove} className="text-sm text-danger">Remove</button>
          )}
        </div>
        <Input
          label="Duration (mm:ss)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Distance (miles)"
          type="number"
          inputMode="decimal"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Calories"
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          disabled={readOnly}
        />
        {!readOnly && saveButton('Save cardio', saveCardio)}
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold">{exerciseName}</h3>
        {!readOnly && onRemove && (
          <button type="button" onClick={onRemove} className="text-sm text-danger">Remove</button>
        )}
      </div>

      {lastSetsSummary && (
        <p className="text-sm text-text-secondary">
          Last time: <span className="text-text font-medium">{lastSetsSummary}</span>
        </p>
      )}

      {lastSession?.note && (
        <div className="rounded-xl bg-surface-secondary px-3 py-2">
          <p className="text-xs text-text-secondary mb-0.5">Last note</p>
          <p className="text-sm text-text">{lastSession.note}</p>
        </div>
      )}

      {!readOnly && (
        <div>
          <label className="text-sm text-text-secondary">Note for next session</label>
          <textarea
            className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base min-h-[72px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did it feel? What to remember?"
          />
        </div>
      )}

      {readOnly && note && (
        <div>
          <p className="text-xs text-text-secondary">Note</p>
          <p className="text-sm">{note}</p>
        </div>
      )}

      <div ref={setListRef} className="flex flex-col gap-2">
        {sets.map((set, idx) => (
          <div
            key={set.rowKey}
            data-drag-row
            className={[
              'flex items-center gap-1 rounded-xl',
              draggingKey === set.rowKey
                ? 'relative bg-surface shadow-lg ring-1 ring-accent/40'
                : isDragging
                  ? 'transition-transform duration-150 ease-out'
                  : '',
            ].join(' ')}
            style={getRowStyle(idx)}
          >
            {!readOnly && (
              <button
                type="button"
                onPointerDown={(e) => startDrag(idx, e)}
                className="flex shrink-0 touch-none select-none cursor-grab active:cursor-grabbing text-text-secondary pl-0.5 pr-2 py-2"
                style={{ touchAction: 'none' }}
                aria-label={`Reorder set ${idx + 1}`}
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
            )}
            <span className="shrink-0 mr-2 text-sm text-text-secondary whitespace-nowrap">Set {idx + 1}</span>
            {exerciseType === 'bodyweight' ? (
              <>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={placeholderFromLast(set, 'reps') ?? 'reps'}
                  value={set.reps || ''}
                  onChange={(e) => updateSet(idx, 'reps', Number(e.target.value))}
                  disabled={readOnly}
                  className="flex-1"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={placeholderFromLast(set, 'added') ?? `added ${unit}`}
                  value={set.added_weight_lb != null && set.added_weight_lb > 0 ? weightInputValue(set.added_weight_lb) : ''}
                  onChange={(e) =>
                    handleWeightInput(e.target.value, (lb) =>
                      updateSet(idx, 'added_weight_lb', lb > 0 ? lb : null),
                    )
                  }
                  disabled={readOnly}
                  className="w-24"
                />
              </>
            ) : (
              <>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={placeholderFromLast(set, 'weight') ?? unit}
                  value={weightInputValue(set.weight_lb)}
                  onChange={(e) => handleWeightInput(e.target.value, (lb) => updateSet(idx, 'weight_lb', lb))}
                  disabled={readOnly}
                  className="flex-1"
                />
                <span className="text-text-secondary">×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={placeholderFromLast(set, 'reps') ?? 'reps'}
                  value={set.reps || ''}
                  onChange={(e) => updateSet(idx, 'reps', Number(e.target.value))}
                  disabled={readOnly}
                  className="w-20"
                />
              </>
            )}
            {!readOnly && sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(idx)}
                className="shrink-0 px-1 py-2 text-text-secondary hover:text-danger"
                aria-label={`Delete set ${idx + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <>
          <Button variant="ghost" onClick={addSet}>+ Add set</Button>
          {saveButton('Save', saveStrength)}
        </>
      )}
    </Card>
  )
})

export async function handleRemoveExercise(workoutExerciseId: string, onDone: () => void) {
  await removeWorkoutExercise(workoutExerciseId)
  onDone()
}
