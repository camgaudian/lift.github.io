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
import { Modal } from '@/components/Modal'
import { TrashIcon } from '@/components/TrashIcon'
import { iconDeleteButtonClass } from '@/lib/ui'
import {
  upsertStrengthSets,
  upsertCardioEntry,
  upsertSessionNote,
} from './workoutApi'
import { formatDuration, parseDuration } from '@/lib/format'

const AUTOSAVE_DELAY_MS = 1200

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
  onRemove?: () => void | Promise<void>
  readOnly?: boolean
}

function ExerciseRemoveButton({
  exerciseName,
  onRemove,
}: {
  exerciseName: string
  onRemove: () => void | Promise<void>
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)

  const confirmRemove = async () => {
    setRemoving(true)
    try {
      await onRemove()
      setShowConfirm(false)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={iconDeleteButtonClass}
        aria-label={`Remove ${exerciseName}`}
      >
        <TrashIcon />
      </button>
      {showConfirm && (
        <Modal title="Remove exercise?" onClose={() => !removing && setShowConfirm(false)}>
          <p className="text-sm text-text-secondary">
            Remove <span className="font-medium text-text">{exerciseName}</span> from this workout?
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={removing}
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth disabled={removing} onClick={confirmRemove}>
              {removing ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
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

  // Refs mirror the latest values so debounced autosave and flush-on-exit never
  // persist stale state from an old closure.
  const lastSessionRef = useRef<LastSessionData | null>(null)
  const setsRef = useRef(sets)
  const noteRef = useRef(note)
  const durationRef = useRef(duration)
  const distanceRef = useRef(distance)
  const caloriesRef = useRef(calories)
  const readOnlyRef = useRef(readOnly)
  const dirtyRef = useRef(false)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  setsRef.current = sets
  noteRef.current = note
  durationRef.current = duration
  distanceRef.current = distance
  caloriesRef.current = calories
  readOnlyRef.current = readOnly

  useEffect(() => {
    fetchLastSessionForExercise(exerciseId).then((data) => {
      lastSessionRef.current = data
      setLastSession(data)
    })
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

  // Persist current values without touching React state, so it is safe to call
  // during unmount / tab-hide.
  const persist = async () => {
    if (exerciseType === 'cardio') {
      await upsertCardioEntry(workoutExerciseId, {
        duration_seconds: parseDuration(durationRef.current),
        distance_miles: distanceRef.current ? Number(distanceRef.current) : null,
        calories: caloriesRef.current ? Number(caloriesRef.current) : null,
      })
    } else {
      await upsertStrengthSets(
        workoutExerciseId,
        resolveSetsForSave(setsRef.current, lastSessionRef.current),
      )
      await upsertSessionNote(workoutExerciseId, noteRef.current)
    }
  }
  const persistRef = useRef(persist)
  persistRef.current = persist

  // Stateful save used by autosave and by the parent's "Complete workout" flow.
  const save = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      await persistRef.current()
      dirtyRef.current = false
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
      throw err
    } finally {
      setSaving(false)
    }
  }
  const saveRef = useRef(save)
  saveRef.current = save

  useImperativeHandle(ref, () => ({ save: () => saveRef.current() }), [])

  const scheduleAutosave = () => {
    if (readOnly) return
    dirtyRef.current = true
    setSaved(false)
    setSaveError(null)
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null
      void saveRef.current().catch(() => {})
    }, AUTOSAVE_DELAY_MS)
  }

  const flushAutosave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    if (readOnly || !dirtyRef.current) return
    void saveRef.current().catch(() => {})
  }

  // Flush pending edits when the tab is backgrounded (PWA) or the block unmounts.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
      if (!readOnlyRef.current && dirtyRef.current) {
        void persistRef.current().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
      if (!readOnlyRef.current && dirtyRef.current) {
        void persistRef.current().catch(() => {})
      }
    }
  }, [])

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
    scheduleAutosave()
  }

  const removeSet = (index: number) => {
    setSets((prev) => {
      if (prev.length <= 1) return prev
      return prev
        .filter((_, i) => i !== index)
        .map((set, i) => ({ ...set, set_number: i + 1 }))
    })
    scheduleAutosave()
  }

  const updateSet = (index: number, field: keyof StrengthSet, value: number | boolean | null) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
    scheduleAutosave()
  }

  const { listRef: setListRef, draggingKey, isDragging, startDrag, getRowStyle } = useDragReorder({
    keys: sets.map((set) => set.rowKey),
    disabled: readOnly,
    onReorder: (from, to) => {
      setSets((prev) => reorderSets(prev, from, to))
      scheduleAutosave()
    },
  })

  const autosaveStatus =
    !readOnly && (saveError || saving || saved) ? (
      <span className="shrink-0 text-xs">
        {saveError ? (
          <span className="text-danger">{saveError}</span>
        ) : saving ? (
          <span className="text-text-secondary">Saving…</span>
        ) : (
          <span className="text-accent">✓ Saved</span>
        )}
      </span>
    ) : null

  const exerciseHeader = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h3 className="truncate font-semibold">{exerciseName}</h3>
        {autosaveStatus}
      </div>
      {!readOnly && onRemove && (
        <ExerciseRemoveButton exerciseName={exerciseName} onRemove={onRemove} />
      )}
    </div>
  )

  if (exerciseType === 'cardio') {
    return (
      <Card className="flex flex-col gap-3">
        {exerciseHeader}
        <Input
          label="Duration (mm:ss)"
          value={duration}
          onChange={(e) => {
            setDuration(e.target.value)
            scheduleAutosave()
          }}
          onBlur={flushAutosave}
          disabled={readOnly}
        />
        <Input
          label="Distance (miles)"
          type="number"
          inputMode="decimal"
          value={distance}
          onChange={(e) => {
            setDistance(e.target.value)
            scheduleAutosave()
          }}
          onBlur={flushAutosave}
          disabled={readOnly}
        />
        <Input
          label="Calories"
          type="number"
          value={calories}
          onChange={(e) => {
            setCalories(e.target.value)
            scheduleAutosave()
          }}
          onBlur={flushAutosave}
          disabled={readOnly}
        />
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      {exerciseHeader}

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
            onChange={(e) => {
              setNote(e.target.value)
              scheduleAutosave()
            }}
            onBlur={flushAutosave}
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
                  onBlur={flushAutosave}
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
                  onBlur={flushAutosave}
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
                  onBlur={flushAutosave}
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
                  onBlur={flushAutosave}
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
        <Button variant="ghost" onClick={addSet}>+ Add set</Button>
      )}
    </Card>
  )
})
