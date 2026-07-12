import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { fetchLastSessionForExercise } from '@/lib/stats'
import { useProfile } from '@/contexts/ProfileContext'
import { formatDuration, formatSetsList, parseDuration } from '@/lib/format'
import { displayToLb, lbToDisplay } from '@/lib/units'
import {
  clampReps,
  clampWeightLb,
} from '@/lib/workoutLimits'
import { useDragReorder, reorderList } from '@/lib/useDragReorder'
import type { Exercise, ExerciseType, LastSessionData, StrengthSet } from '@/lib/types'
import { Button } from '@/components/Button'
import { CollapseIcon } from '@/components/CollapseIcon'
import { DragGripIcon } from '@/components/DragGripIcon'
import { ExpandIcon } from '@/components/ExpandIcon'
import { ExerciseRemoveButton } from '@/components/ExerciseRemoveButton'
import { ExerciseSwapButton } from '@/components/ExerciseSwapButton'
import { ReuseIcon } from '@/components/ReuseIcon'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import { cornerButtonClass, useColorPopText } from '@/lib/ui'
import {
  upsertStrengthSets,
  upsertCardioEntry,
  upsertSessionNote,
} from './workoutApi'
import { formatSaveError } from '@/lib/saveError'

const AUTOSAVE_DELAY_MS = 1200
/** Undershoots the collapsible body's `duration-200` so corner buttons appear near the end of open. */
const COLLAPSE_ANIMATION_MS = 125
/** Covers reuse-spin, number tick-up, and autofill-flash. */
const AUTOFILL_ANIM_MS = 900

type AutofillAnimState = {
  rowKey: string
  nonce: number
  reps: number
  weight_lb: number
  added_weight_lb: number | null
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export interface ExerciseBlockHandle {
  save: (workoutExerciseIdOverride?: string) => Promise<void>
  validate: () => boolean
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
  onSwap?: (exerciseId: string) => void | Promise<void>
  swapExercises?: Exercise[]
  swapExcludeIds?: Iterable<string>
  readOnly?: boolean
  persistenceMode?: 'auto' | 'manual'
  sessionNoteReadOnly?: boolean
  onDirty?: () => void
  /** When true, this block can be collapsed (active in-progress workouts only). */
  collapseEnabled?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

type SetRow = StrengthSet & { rowKey: string; lastPlaceholderIndex?: number }

function isSetEmpty(set: StrengthSet, exerciseType: ExerciseType): boolean {
  if (exerciseType === 'bodyweight') {
    return set.reps <= 0 && (set.added_weight_lb ?? 0) <= 0
  }
  return set.reps <= 0 && set.weight_lb <= 0
}

function isSetComplete(set: StrengthSet, exerciseType: ExerciseType): boolean {
  if (exerciseType === 'bodyweight') {
    return set.reps > 0
  }
  return set.reps > 0 && set.weight_lb > 0
}

function isSetPartial(set: StrengthSet, exerciseType: ExerciseType): boolean {
  return !isSetEmpty(set, exerciseType) && !isSetComplete(set, exerciseType)
}

function invalidSetFields(
  set: StrengthSet,
  exerciseType: ExerciseType,
): Array<'weight' | 'reps' | 'added'> {
  if (!isSetPartial(set, exerciseType)) return []
  if (exerciseType === 'bodyweight') {
    return set.reps <= 0 ? ['reps'] : []
  }
  const missing: Array<'weight' | 'reps'> = []
  if (set.weight_lb <= 0) missing.push('weight')
  if (set.reps <= 0) missing.push('reps')
  return missing
}

/** Fields to highlight when collapse is blocked (empty or partial rows). */
function incompleteSetFields(
  set: StrengthSet,
  exerciseType: ExerciseType,
): Array<'weight' | 'reps' | 'added'> {
  if (isSetComplete(set, exerciseType)) return []
  if (isSetPartial(set, exerciseType)) return invalidSetFields(set, exerciseType)
  if (exerciseType === 'bodyweight') return ['reps']
  return ['weight', 'reps']
}

function canCollapseStrengthSets(sets: StrengthSet[], exerciseType: ExerciseType): boolean {
  if (sets.length === 0) return false
  return sets.every((set) => isSetComplete(set, exerciseType))
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
  exerciseType: ExerciseType,
): Omit<StrengthSet, 'id' | 'workout_exercise_id'>[] {
  return sets
    .filter((set) => !isSetEmpty(set, exerciseType))
    .map((set, index) => ({
      set_number: index + 1,
      reps: clampReps(set.reps),
      weight_lb: clampWeightLb(set.weight_lb),
      added_weight_lb:
        set.added_weight_lb != null && set.added_weight_lb > 0
          ? clampWeightLb(set.added_weight_lb)
          : set.added_weight_lb,
      is_warmup: set.is_warmup,
    }))
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
    onSwap,
    swapExercises,
    swapExcludeIds,
    readOnly = false,
    persistenceMode = 'auto',
    sessionNoteReadOnly = false,
    onDirty,
    collapseEnabled = false,
    collapsed = false,
    onCollapsedChange,
  },
  ref,
) {
  const { unit } = useProfile()
  const mutedTextClass = useColorPopText('text-text-secondary')
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
  const [showValidation, setShowValidation] = useState(false)
  const [showCollapseValidation, setShowCollapseValidation] = useState(false)
  // Corner buttons sit at the card's absolute bottom; wait for expand to finish
  // so they don't flash on the still-growing card mid-animation.
  const [cornerButtonsReady, setCornerButtonsReady] = useState(!collapsed)
  const [autofillAnim, setAutofillAnim] = useState<AutofillAnimState | null>(null)

  // Refs mirror the latest values so debounced autosave and flush-on-exit never
  // persist stale state from an old closure.
  const lastSessionRef = useRef<LastSessionData | null>(null)
  const setsRef = useRef(sets)
  const noteRef = useRef(note)
  const durationRef = useRef(duration)
  const distanceRef = useRef(distance)
  const caloriesRef = useRef(calories)
  const readOnlyRef = useRef(readOnly)
  const persistenceModeRef = useRef(persistenceMode)
  const dirtyRef = useRef(false)
  const revisionRef = useRef(0)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autofillAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autofillRafRef = useRef<number | null>(null)
  const persistQueueRef = useRef(Promise.resolve())
  const saveCountRef = useRef(0)
  setsRef.current = sets
  noteRef.current = note
  durationRef.current = duration
  distanceRef.current = distance
  caloriesRef.current = calories
  readOnlyRef.current = readOnly
  persistenceModeRef.current = persistenceMode

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
      const next = toSetRows(initialSets, nextRowKey)
      setsRef.current = next
      setSets(next)
    }
  }, [initialSets])

  const commitSets = (updater: (prev: SetRow[]) => SetRow[]) => {
    const next = updater(setsRef.current)
    setsRef.current = next
    setSets(next)
    scheduleAutosave()
  }

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
    onUpdate(clampWeightLb(displayToLb(Number(raw), unit)))
  }

  const handleRepsInput = (index: number, raw: string) => {
    updateSet(index, 'reps', clampReps(Number(raw)))
  }

  // Persist current values without touching React state, so it is safe to call
  // during unmount / tab-hide.
  const persist = async (workoutExerciseIdOverride?: string) => {
    const weId = workoutExerciseIdOverride ?? workoutExerciseId
    if (exerciseType === 'cardio') {
      await upsertCardioEntry(weId, {
        duration_seconds: parseDuration(durationRef.current),
        distance_miles: distanceRef.current ? Number(distanceRef.current) : null,
        calories: caloriesRef.current ? Number(caloriesRef.current) : null,
      })
    } else {
      await upsertStrengthSets(
        weId,
        resolveSetsForSave(setsRef.current, exerciseType),
      )
      if (!sessionNoteReadOnly) {
        await upsertSessionNote(weId, noteRef.current)
      }
    }
  }
  const persistRef = useRef(persist)
  persistRef.current = persist

  const enqueuePersist = (workoutExerciseIdOverride?: string): Promise<void> => {
    const next = persistQueueRef.current.then(() =>
      persistRef.current(workoutExerciseIdOverride),
    )
    persistQueueRef.current = next.catch(() => {})
    return next
  }

  // Stateful save used by autosave and by the parent's "Complete workout" flow.
  const save = async (workoutExerciseIdOverride?: string) => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    const revisionAtSave = revisionRef.current
    saveCountRef.current += 1
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      await enqueuePersist(workoutExerciseIdOverride)
      if (revisionRef.current === revisionAtSave) {
        dirtyRef.current = false
        if (persistenceModeRef.current === 'auto') {
          setSaved(true)
        }
      }
    } catch (err) {
      setSaveError(formatSaveError(err))
      throw err
    } finally {
      saveCountRef.current -= 1
      if (saveCountRef.current === 0) {
        setSaving(false)
      }
    }
  }
  const saveRef = useRef(save)
  saveRef.current = save

  const validate = () => {
    const partial = setsRef.current.some((set) => isSetPartial(set, exerciseType))
    if (partial) setShowValidation(true)
    return !partial
  }

  useImperativeHandle(ref, () => ({
    save: (workoutExerciseIdOverride?: string) => saveRef.current(workoutExerciseIdOverride),
    validate,
  }), [exerciseType])

  const markDirty = () => {
    if (readOnly) return
    setShowValidation(false)
    setShowCollapseValidation(false)
    dirtyRef.current = true
    revisionRef.current += 1
    if (persistenceModeRef.current === 'manual') {
      onDirty?.()
      return
    }
    setSaved(false)
    setSaveError(null)
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null
      void saveRef.current().catch(() => {})
    }, AUTOSAVE_DELAY_MS)
  }

  const scheduleAutosave = () => {
    markDirty()
  }

  const flushAutosave = () => {
    if (persistenceModeRef.current === 'manual') return
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
      if (persistenceModeRef.current === 'manual') return
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
      if (!readOnlyRef.current && dirtyRef.current) {
        void enqueuePersist().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (autofillAnimTimerRef.current) clearTimeout(autofillAnimTimerRef.current)
      if (autofillRafRef.current != null) cancelAnimationFrame(autofillRafRef.current)
      if (persistenceModeRef.current === 'manual') return
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
      if (!readOnlyRef.current && dirtyRef.current) {
        void enqueuePersist().catch(() => {})
      }
    }
  }, [])

  const addSet = () => {
    commitSets((prev) => [
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
    commitSets((prev) => {
      if (prev.length <= 1) return prev
      return prev
        .filter((_, i) => i !== index)
        .map((set, i) => ({ ...set, set_number: i + 1 }))
    })
  }

  const updateSet = (index: number, field: keyof StrengthSet, value: number | boolean | null) => {
    commitSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  const fillSetFromLast = (index: number) => {
    const set = setsRef.current[index]
    // Same lookup as placeholderFromLast — survives reorder via lastPlaceholderIndex
    const last = lastSessionRef.current?.sets?.[set?.lastPlaceholderIndex ?? -1]
    if (!set || !last) return

    if (autofillAnimTimerRef.current) {
      clearTimeout(autofillAnimTimerRef.current)
      autofillAnimTimerRef.current = null
    }
    if (autofillRafRef.current != null) {
      cancelAnimationFrame(autofillRafRef.current)
      autofillRafRef.current = null
    }

    const nonce =
      (autofillAnim?.rowKey === set.rowKey ? autofillAnim.nonce : 0) + 1
    const target = {
      reps: last.reps,
      weight_lb: last.weight_lb,
      added_weight_lb: last.added_weight_lb,
    }

    const commitTarget = () => {
      commitSets((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...target } : s)),
      )
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    commitTarget()

    if (reducedMotion) {
      setAutofillAnim({ rowKey: set.rowKey, nonce, ...target })
      autofillAnimTimerRef.current = setTimeout(() => {
        setAutofillAnim(null)
        autofillAnimTimerRef.current = null
      }, AUTOFILL_ANIM_MS)
      return
    }

    const targetWeightDisplay = lbToDisplay(target.weight_lb, unit)
    const targetAddedDisplay =
      target.added_weight_lb != null && target.added_weight_lb > 0
        ? lbToDisplay(target.added_weight_lb, unit)
        : 0

    setAutofillAnim({
      rowKey: set.rowKey,
      nonce,
      reps: 0,
      weight_lb: 0,
      added_weight_lb: targetAddedDisplay > 0 ? 0 : null,
    })

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / AUTOFILL_ANIM_MS)
      const e = easeOutCubic(t)
      const weightDisplay =
        unit === 'kg'
          ? Math.round(lerp(0, targetWeightDisplay, e) * 10) / 10
          : Math.round(lerp(0, targetWeightDisplay, e))
      const addedDisplay =
        targetAddedDisplay > 0
          ? unit === 'kg'
            ? Math.round(lerp(0, targetAddedDisplay, e) * 10) / 10
            : Math.round(lerp(0, targetAddedDisplay, e))
          : 0
      setAutofillAnim({
        rowKey: set.rowKey,
        nonce,
        reps: Math.round(lerp(0, target.reps, e)),
        weight_lb: displayToLb(weightDisplay, unit),
        added_weight_lb: targetAddedDisplay > 0 ? displayToLb(addedDisplay, unit) : null,
      })
      if (t < 1) {
        autofillRafRef.current = requestAnimationFrame(tick)
        return
      }
      autofillRafRef.current = null
      setAutofillAnim(null)
    }
    autofillRafRef.current = requestAnimationFrame(tick)
  }

  const hasLastPlaceholder = (set: SetRow) =>
    lastSession?.sets?.[set.lastPlaceholderIndex ?? -1] != null

  const isAutofillAnimating = (set: SetRow) => autofillAnim?.rowKey === set.rowKey

  const autofillInputClass = (set: SetRow) =>
    isAutofillAnimating(set) ? 'autofill-flash' : ''

  const setDisplayValues = (set: SetRow): SetRow => {
    if (!autofillAnim || autofillAnim.rowKey !== set.rowKey) return set
    return {
      ...set,
      reps: autofillAnim.reps,
      weight_lb: autofillAnim.weight_lb,
      added_weight_lb: autofillAnim.added_weight_lb,
    }
  }

  const fieldError = (set: SetRow, field: 'weight' | 'reps' | 'added') => {
    if (showCollapseValidation) {
      return incompleteSetFields(set, exerciseType).includes(field)
    }
    return showValidation && invalidSetFields(set, exerciseType).includes(field)
  }

  const isCollapsed = collapseEnabled && collapsed
  const durationValid = parseDuration(duration) > 0
  const durationError = showCollapseValidation && !durationValid

  useEffect(() => {
    if (isCollapsed) {
      setCornerButtonsReady(false)
      return
    }
    const timer = setTimeout(() => setCornerButtonsReady(true), COLLAPSE_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [isCollapsed])

  const tryCollapse = () => {
    if (exerciseType === 'cardio') {
      if (!durationValid) {
        setShowCollapseValidation(true)
        return
      }
      setShowCollapseValidation(false)
      onCollapsedChange?.(true)
      return
    }
    if (!canCollapseStrengthSets(setsRef.current, exerciseType)) {
      setShowCollapseValidation(true)
      return
    }
    setShowCollapseValidation(false)
    onCollapsedChange?.(true)
  }

  const expand = () => {
    setShowCollapseValidation(false)
    onCollapsedChange?.(false)
  }

  const { listRef: setListRef, draggingKey, isDragging, startDrag, getRowStyle } = useDragReorder({
    keys: sets.map((set) => set.rowKey),
    disabled: readOnly || isCollapsed,
    onReorder: (from, to) => {
      commitSets((prev) => reorderSets(prev, from, to))
    },
  })

  const autosaveStatus =
    !isCollapsed &&
    persistenceMode === 'auto' &&
    !readOnly &&
    (saveError || saving || saved) ? (
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

  // Swap/remove only live in the header when there's no collapse feature (e.g.
  // template editing). In an active workout they move to the bottom corners, and
  // collapse/expand take the header slot instead.
  const headerSwapButton =
    onSwap && swapExercises && !collapseEnabled ? (
      <ExerciseSwapButton
        exerciseName={exerciseName}
        exercises={swapExercises}
        excludeIds={swapExcludeIds}
        onSwap={onSwap}
      />
    ) : null

  const collapseButtonClass =
    'shrink-0 rounded-lg p-2 -mr-1.5 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-accent'

  const headerCollapseButton = collapseEnabled && !readOnly ? (
    isCollapsed ? (
      <button
        type="button"
        onClick={expand}
        className={collapseButtonClass}
        aria-label={`Expand ${exerciseName}`}
        aria-expanded={false}
      >
        <ExpandIcon size={23} strokeWidth={2} />
      </button>
    ) : (
      <button
        type="button"
        onClick={tryCollapse}
        className={collapseButtonClass}
        aria-label={`Collapse ${exerciseName}`}
        aria-expanded
      >
        <CollapseIcon size={23} strokeWidth={2} />
      </button>
    )
  ) : null

  const exerciseHeader = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h3 className="truncate font-semibold">{exerciseName}</h3>
        {autosaveStatus}
      </div>
      {!readOnly && (headerCollapseButton || headerSwapButton || (!collapseEnabled && onRemove)) && (
        <div className="flex shrink-0 items-center gap-0.5">
          {headerSwapButton}
          {!collapseEnabled && onRemove && (
            <ExerciseRemoveButton exerciseName={exerciseName} onRemove={onRemove} />
          )}
          {headerCollapseButton}
        </div>
      )}
    </div>
  )

  const bodyClassName = [
    'grid transition-[grid-template-rows] duration-200 ease-out',
    isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
  ].join(' ')

  // Quarter-circle buttons anchored to the card's own bottom corners (active
  // workouts only). Rendered as a sibling of the collapsible body so they aren't
  // clipped by its overflow-hidden animation wrapper. Hidden while collapsed,
  // and only remounted after the expand animation finishes.
  const cornerButtons =
    collapseEnabled && !readOnly && !isCollapsed && cornerButtonsReady ? (
      <>
        {onSwap && swapExercises && (
          <ExerciseSwapButton
            exerciseName={exerciseName}
            exercises={swapExercises}
            excludeIds={swapExcludeIds}
            onSwap={onSwap}
            className={cornerButtonClass('left')}
            iconSize={18}
          />
        )}
        {onRemove && (
          <ExerciseRemoveButton
            exerciseName={exerciseName}
            onRemove={onRemove}
            className={cornerButtonClass('right', 'danger')}
            iconSize={18}
          />
        )}
      </>
    ) : null

  if (exerciseType === 'cardio') {
    return (
      <Card className="relative flex flex-col overflow-hidden">
        {exerciseHeader}
        <div className={bodyClassName}>
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-3 pt-3">
              <Input
                label="Duration (mm:ss)"
                value={duration}
                error={durationError}
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
            </div>
          </div>
        </div>
        {cornerButtons}
      </Card>
    )
  }

  return (
    <Card className="relative flex flex-col overflow-hidden">
      {exerciseHeader}

      <div className={bodyClassName}>
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 pt-3">
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

            {!readOnly && !sessionNoteReadOnly && (
              <div>
                <label className={`text-sm ${mutedTextClass}`}>Note for next session</label>
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

            {(readOnly || sessionNoteReadOnly) && note && (
              <div>
                <p className="text-xs text-text-secondary">Note</p>
                <p className="text-sm">{note}</p>
              </div>
            )}

            <div ref={setListRef} className="flex flex-col gap-2">
                  {sets.map((set, idx) => {
                const display = setDisplayValues(set)
                const animating = isAutofillAnimating(set)
                return (
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
                      className={`flex shrink-0 touch-none select-none cursor-grab active:cursor-grabbing pl-0.5 pr-2 py-2 ${mutedTextClass}`}
                      style={{ touchAction: 'none' }}
                      aria-label={`Reorder set ${idx + 1}`}
                    >
                      <DragGripIcon />
                    </button>
                  )}
                  <span className={`shrink-0 mr-2 text-sm whitespace-nowrap ${mutedTextClass}`}>Set {idx + 1}</span>
                  {!readOnly &&
                    (hasLastPlaceholder(set) ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (animating) return
                          fillSetFromLast(idx)
                        }}
                        className={[
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-surface-secondary/60',
                          animating
                            ? 'pointer-events-none border-accent/40 bg-surface-secondary text-accent'
                            : 'border-border text-text-secondary transition-colors hover:border-accent/40 hover:bg-surface-secondary hover:text-accent',
                        ].join(' ')}
                        aria-label={`Reuse last values for set ${idx + 1}`}
                        aria-busy={animating || undefined}
                      >
                        <span
                          key={animating ? `spin-${autofillAnim?.nonce}` : 'idle'}
                          className={
                            animating
                              ? 'reuse-spin'
                              : 'flex h-[18px] w-[18px] shrink-0 items-center justify-center'
                          }
                        >
                          <ReuseIcon size={18} />
                        </span>
                      </button>
                    ) : (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/50 text-text-secondary/25 pointer-events-none select-none"
                        aria-hidden
                      >
                        <ReuseIcon size={18} />
                      </span>
                    ))}
                  {exerciseType === 'bodyweight' ? (
                    <>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder={placeholderFromLast(set, 'reps') ?? 'reps'}
                        value={display.reps || ''}
                        error={fieldError(set, 'reps')}
                        onChange={(e) => handleRepsInput(idx, e.target.value)}
                        onBlur={flushAutosave}
                        disabled={readOnly || animating}
                        className={`flex-1 ${autofillInputClass(set)}`}
                      />
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder={placeholderFromLast(set, 'added') ?? `added ${unit}`}
                        value={display.added_weight_lb != null && display.added_weight_lb > 0 ? weightInputValue(display.added_weight_lb) : ''}
                        error={fieldError(set, 'added')}
                        onChange={(e) =>
                          handleWeightInput(e.target.value, (lb) =>
                            updateSet(idx, 'added_weight_lb', lb > 0 ? lb : null),
                          )
                        }
                        onBlur={flushAutosave}
                        disabled={readOnly || animating}
                        className={`w-24 ${autofillInputClass(set)}`}
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder={placeholderFromLast(set, 'weight') ?? unit}
                        value={weightInputValue(display.weight_lb)}
                        error={fieldError(set, 'weight')}
                        onChange={(e) => handleWeightInput(e.target.value, (lb) => updateSet(idx, 'weight_lb', lb))}
                        onBlur={flushAutosave}
                        disabled={readOnly || animating}
                        className={`flex-1 ${autofillInputClass(set)}`}
                      />
                      <span className="text-text-secondary">×</span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder={placeholderFromLast(set, 'reps') ?? 'reps'}
                        value={display.reps || ''}
                        error={fieldError(set, 'reps')}
                        onChange={(e) => handleRepsInput(idx, e.target.value)}
                        onBlur={flushAutosave}
                        disabled={readOnly || animating}
                        className={`w-20 ${autofillInputClass(set)}`}
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
                )
              })}
            </div>

            {!readOnly && (
              <Button
                variant="ghost"
                onClick={addSet}
                className="mt-2 hover:!bg-transparent hover:text-accent-hover"
              >
                + Add set
              </Button>
            )}
          </div>
        </div>
      </div>
      {cornerButtons}
    </Card>
  )
})
