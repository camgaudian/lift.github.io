import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchWorkout,
  addExerciseToWorkout,
  clearStaleSessionNotesForWorkout,
  completeWorkout,
  cancelWorkout,
  reorderWorkoutExercises,
  removeWorkoutExercise,
  updateWorkout,
} from './workoutApi'
import { ExerciseBlock, type ExerciseBlockHandle } from './ExerciseBlock'
import { useExercises } from '@/features/exercises/useExercises'
import { BackButton } from '@/components/BackButton'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Confetti } from '@/components/Confetti'
import { Input } from '@/components/Input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { DragGripIcon } from '@/components/DragGripIcon'
import { ReorderModeIcon } from '@/components/ReorderModeIcon'
import { TrashIcon } from '@/components/TrashIcon'
import { iconDeleteButtonClass, iconToolbarButtonClass } from '@/lib/ui'
import { ExercisePickerPanel } from '@/features/exercises/ExercisePicker'
import { WorkoutDateHeader } from './WorkoutDateHeader'
import { WorkoutFunStatsSection } from './WorkoutFunStatsSection'
import { WorkoutAchievementsSection } from './WorkoutAchievementsSection'
import { SaveEntriesNotice } from './SaveEntriesNotice'
import { useDragReorder, reorderList } from '@/lib/useDragReorder'
import { navFromState, setStoredNavFrom } from '@/lib/nav'
import {
  clearCollapsedExercises,
  getCollapsedExerciseIds,
  removeCollapsedExercise,
  saveCollapsedExerciseIds,
} from '@/lib/collapsedExercises'
import { formatSaveError } from '@/lib/saveError'
import type { Workout, WorkoutExercise } from '@/lib/types'

const TEMP_ID_PREFIX = 'temp-'

type WorkoutLocationState = {
  navFrom?: string
  pendingCompletedAt?: string
}

function isTempExerciseId(id: string) {
  return id.startsWith(TEMP_ID_PREFIX)
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ActiveWorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as WorkoutLocationState | null
  const pendingCompletedAt = locationState?.pendingCompletedAt
  const { exercises: allExercises } = useExercises()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [items, setItems] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showCompletionSummary, setShowCompletionSummary] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [discardError, setDiscardError] = useState<string | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editSnapshot, setEditSnapshot] = useState<WorkoutExercise[]>([])
  const [removedExerciseIds, setRemovedExerciseIds] = useState<string[]>([])
  const [draftStartedAt, setDraftStartedAt] = useState('')
  const [draftCompletedAt, setDraftCompletedAt] = useState('')
  const [savingEdits, setSavingEdits] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showCancelEditConfirm, setShowCancelEditConfirm] = useState(false)
  const [showSaveEditConfirm, setShowSaveEditConfirm] = useState(false)
  const [editFormDirty, setEditFormDirty] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const exerciseRefs = useRef<Record<string, ExerciseBlockHandle | null>>({})

  const reload = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { workout: w, exercises } = await fetchWorkout(id)
      setWorkout(w)
      setItems(exercises)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [id])

  useEffect(() => {
    if (!id || workout?.status !== 'in_progress') {
      setCollapsedIds(new Set())
      return
    }
    setCollapsedIds(getCollapsedExerciseIds(id))
  }, [id, workout?.status])

  const setExerciseCollapsed = (exerciseId: string, collapsed: boolean) => {
    if (!id) return
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (collapsed) next.add(exerciseId)
      else next.delete(exerciseId)
      saveCollapsedExerciseIds(id, next)
      return next
    })
  }

  const dropCollapsedExercise = (exerciseId: string) => {
    if (!id) return
    removeCollapsedExercise(id, exerciseId)
    setCollapsedIds((prev) => {
      if (!prev.has(exerciseId)) return prev
      const next = new Set(prev)
      next.delete(exerciseId)
      return next
    })
  }

  useEffect(() => {
    const fromState = navFromState(location.state)
    if (fromState) {
      setStoredNavFrom(fromState)
      return
    }
    if (workout) {
      setStoredNavFrom(workout.status === 'completed' ? 'history' : 'home')
    }
  }, [location.state, workout?.status])

  useEffect(() => {
    if (!showCompletionSummary) return
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([60, 40, 120])
    }
  }, [showCompletionSummary])

  const handleAddExercise = async (exerciseId: string) => {
    if (!id || adding) return
    const ex = allExercises.find((e) => e.id === exerciseId)
    if (!ex) return

    if (isEditing) {
      const tempId = `${TEMP_ID_PREFIX}${crypto.randomUUID()}`
      const newItem: WorkoutExercise = {
        id: tempId,
        workout_id: id,
        exercise_id: ex.id,
        sort_order: items.length,
        exercise_type: ex.exercise_type,
        exercise: ex,
        strength_sets: ex.exercise_type === 'cardio' ? undefined : [],
        cardio_entry:
          ex.exercise_type === 'cardio'
            ? { duration_seconds: 0, distance_miles: null, calories: null }
            : null,
        session_note:
          ex.exercise_type !== 'cardio' ? { note_for_next_time: '' } : null,
      }
      setItems((prev) => [...prev, newItem])
      setEditFormDirty(true)
      setShowPicker(false)
      return
    }

    setAdding(true)
    try {
      await addExerciseToWorkout(id, ex.id, ex.exercise_type)
      setShowPicker(false)
      reload()
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveExercise = async (item: WorkoutExercise) => {
    dropCollapsedExercise(item.id)
    if (isEditing) {
      if (!isTempExerciseId(item.id)) {
        setRemovedExerciseIds((prev) => [...prev, item.id])
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      return
    }
    await removeWorkoutExercise(item.id)
    reload()
  }

  const handleSwapExercise = async (item: WorkoutExercise, exerciseId: string) => {
    if (!id) return
    const ex = allExercises.find((e) => e.id === exerciseId)
    if (!ex) return

    const index = items.findIndex((i) => i.id === item.id)
    if (index < 0) return

    if (isEditing) {
      dropCollapsedExercise(item.id)
      if (!isTempExerciseId(item.id)) {
        setRemovedExerciseIds((prev) => [...prev, item.id])
      }
      const tempId = `${TEMP_ID_PREFIX}${crypto.randomUUID()}`
      const replacement: WorkoutExercise = {
        id: tempId,
        workout_id: id,
        exercise_id: ex.id,
        sort_order: index,
        exercise_type: ex.exercise_type,
        exercise: ex,
        strength_sets: ex.exercise_type === 'cardio' ? undefined : [],
        cardio_entry:
          ex.exercise_type === 'cardio'
            ? { duration_seconds: 0, distance_miles: null, calories: null }
            : null,
        session_note:
          ex.exercise_type !== 'cardio' ? { note_for_next_time: '' } : null,
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? replacement : i)))
      setEditFormDirty(true)
      return
    }

    dropCollapsedExercise(item.id)
    await removeWorkoutExercise(item.id)
    const added = await addExerciseToWorkout(id, ex.id, ex.exercise_type, index)
    const orderedIds = items.map((i) => (i.id === item.id ? added.id : i.id))
    await reorderWorkoutExercises(orderedIds)
    await reload()
  }

  const openCompleteConfirm = () => {
    setCompleteError(null)

    const hasPartialSets = items.some((item) => {
      if (item.exercise_type === 'cardio') return false
      const block = exerciseRefs.current[item.id]
      return block ? !block.validate() : false
    })
    if (hasPartialSets) {
      setCompleteError('Please ensure all sets are filled in.')
      return
    }

    setShowCompleteConfirm(true)
  }

  const handleComplete = async () => {
    if (!id) return
    setCompleteError(null)
    setCompleting(true)
    try {
      await clearStaleSessionNotesForWorkout(id)
      await Promise.all(items.map((item) => exerciseRefs.current[item.id]?.save()))
      await completeWorkout(id, pendingCompletedAt)
      clearCollapsedExercises(id)
      setCollapsedIds(new Set())
      const { workout: w, exercises } = await fetchWorkout(id)
      setWorkout(w)
      setItems(exercises)
      setShowCompletionSummary(true)
    } catch (err) {
      setCompleteError(formatSaveError(err, "Failed to complete."))
    } finally {
      setCompleting(false)
      setShowCompleteConfirm(false)
    }
  }

  const handleDone = () => navigate('/history', { state: { navFrom: 'history' } })

  const confirmDiscard = async () => {
    if (!id) return
    setDiscarding(true)
    setDiscardError(null)
    try {
      await cancelWorkout(id)
      clearCollapsedExercises(id)
      setCollapsedIds(new Set())
      navigate('/')
    } catch (err) {
      setDiscardError(formatSaveError(err, "Failed to discard."))
    } finally {
      setDiscarding(false)
    }
  }

  const enterEditMode = () => {
    if (!workout) return
    setEditSnapshot(structuredClone(items))
    setRemovedExerciseIds([])
    setEditFormDirty(false)
    setDraftStartedAt(toDatetimeLocalValue(workout.started_at))
    setDraftCompletedAt(toDatetimeLocalValue(workout.completed_at))
    setSaveError(null)
    setShowPicker(false)
    setIsEditing(true)
  }

  const hasEditChanges = () => {
    if (editFormDirty) return true
    if (removedExerciseIds.length > 0) return true
    if (draftStartedAt !== toDatetimeLocalValue(workout?.started_at)) return true
    if (draftCompletedAt !== toDatetimeLocalValue(workout?.completed_at)) return true
    return JSON.stringify(items) !== JSON.stringify(editSnapshot)
  }

  const exitEditMode = () => {
    setIsEditing(false)
    setEditSnapshot([])
    setRemovedExerciseIds([])
    setEditFormDirty(false)
    setSaveError(null)
    setShowPicker(false)
  }

  const requestCancelEdit = () => {
    if (hasEditChanges()) {
      setShowCancelEditConfirm(true)
      return
    }
    exitEditMode()
    void reload()
  }

  const confirmCancelEdit = async () => {
    setShowCancelEditConfirm(false)
    exitEditMode()
    await reload()
  }

  const openSaveEditConfirm = () => {
    setSaveError(null)

    if (items.length === 0) {
      setSaveError('Add at least one exercise.')
      return
    }

    const hasPartialSets = items.some((item) => {
      if (item.exercise_type === 'cardio') return false
      const block = exerciseRefs.current[item.id]
      return block ? !block.validate() : false
    })
    if (hasPartialSets) {
      setSaveError('Please ensure all sets are filled in.')
      return
    }

    if (!draftStartedAt || !draftCompletedAt) {
      setSaveError('Start and end times are required.')
      return
    }

    const start = new Date(draftStartedAt)
    const end = new Date(draftCompletedAt)
    if (start > end) {
      setSaveError('Start time must be before end time.')
      return
    }

    setShowSaveEditConfirm(true)
  }

  const confirmSaveEdits = async () => {
    if (!id || !workout) return
    setSaveError(null)

    const start = new Date(draftStartedAt)
    const end = new Date(draftCompletedAt)

    setSavingEdits(true)
    try {
      for (const removedId of removedExerciseIds) {
        await removeWorkoutExercise(removedId)
      }

      const idMap: Record<string, string> = {}
      for (const [index, item] of items.entries()) {
        if (!isTempExerciseId(item.id)) continue
        const added = await addExerciseToWorkout(id, item.exercise_id, item.exercise_type, index)
        idMap[item.id] = added.id
      }

      const finalOrderedIds = items.map((item) => idMap[item.id] ?? item.id)
      await reorderWorkoutExercises(finalOrderedIds)

      await Promise.all(
        items.map((item) => {
          const weId = idMap[item.id] ?? item.id
          return exerciseRefs.current[item.id]?.save(weId)
        }),
      )

      await updateWorkout(id, {
        started_at: start.toISOString(),
        completed_at: end.toISOString(),
      })

      setShowSaveEditConfirm(false)
      exitEditMode()
      await reload()
    } catch (err) {
      setSaveError(formatSaveError(err, "Failed to save."))
    } finally {
      setSavingEdits(false)
    }
  }

  const isCompleted = workout?.status === 'completed'
  const showEditable = !isCompleted || isEditing
  const blockReadOnly = isCompleted && !isEditing

  const handleReorder = (from: number, to: number) => {
    const next = reorderList(items, from, to)
    setItems(next)
    void reorderWorkoutExercises(next.map((item) => item.id))
  }

  const { listRef, draggingKey, isDragging, startDrag, getRowStyle } = useDragReorder({
    keys: items.map((item) => item.id),
    onReorder: handleReorder,
    disabled: isCompleted || !reorderMode,
  })

  const toggleReorderMode = () => {
    setReorderMode((on) => {
      if (on) return false
      setShowPicker(false)
      return true
    })
  }

  const exerciseName = (item: WorkoutExercise) =>
    (item.exercise as { name: string } | undefined)?.name ?? 'Exercise'

  if (loading) return <LoadingSpinner />
  const alreadyAdded = new Set(items.map((i) => i.exercise_id))

  if (showCompletionSummary) {
    return (
      <div className="flex min-h-full flex-col justify-center gap-5 py-6">
        <Confetti />
        <h1 className="text-2xl font-semibold">Workout complete!</h1>
        <WorkoutAchievementsSection workoutId={id} exercises={items} />
        <WorkoutFunStatsSection exercises={items} animate />
        <Button fullWidth size="lg" onClick={handleDone}>
          Done
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col justify-center gap-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {isCompleted && !isEditing && (
              <BackButton to="/history" label="Back to history" state={{ navFrom: 'history' }} />
            )}
            <h1 className="text-2xl font-semibold">
              {isEditing
                ? 'Editing workout'
                : isCompleted
                  ? 'Workout'
                  : reorderMode
                    ? 'Reorder exercises'
                    : 'Active workout'}
            </h1>
            {!isCompleted && !reorderMode && items.length > 0 && <SaveEntriesNotice />}
          </div>
        </div>
        {isCompleted && !isEditing && (
          <Button variant="secondary" size="sm" onClick={enterEditMode}>
            Edit
          </Button>
        )}
        {isEditing && (
          <Button variant="ghost" size="sm" onClick={requestCancelEdit} disabled={savingEdits}>
            Cancel
          </Button>
        )}
        {!isCompleted && (
          <div className="flex shrink-0 items-center gap-0.5">
            {items.length > 1 && (
              <button
                type="button"
                onClick={toggleReorderMode}
                className={[
                  iconToolbarButtonClass,
                  reorderMode ? 'bg-accent/15 text-accent' : 'hover:text-text',
                ].join(' ')}
                aria-label={reorderMode ? 'Done reordering' : 'Reorder exercises'}
                aria-pressed={reorderMode}
              >
                <ReorderModeIcon />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDiscardError(null)
                setShowDiscardConfirm(true)
              }}
              className={iconDeleteButtonClass}
              aria-label="Discard workout"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {isCompleted && !isEditing && workout && <WorkoutDateHeader workout={workout} />}

      {isEditing && (
        <Card className="flex flex-col gap-3">
          <Input
            label="Started"
            type="datetime-local"
            value={draftStartedAt}
            onChange={(e) => setDraftStartedAt(e.target.value)}
            disabled={savingEdits}
          />
          <Input
            label="Completed"
            type="datetime-local"
            value={draftCompletedAt}
            onChange={(e) => setDraftCompletedAt(e.target.value)}
            disabled={savingEdits}
          />
        </Card>
      )}

      {isCompleted && !isEditing && (
        <>
          <WorkoutAchievementsSection workoutId={id} exercises={items} />
          <WorkoutFunStatsSection exercises={items} />
        </>
      )}

      {reorderMode && (
        <div ref={listRef} className="flex flex-col gap-2">
          <p className="px-1 text-sm text-text-secondary">
            Drag exercises into a new order, then tap the reorder icon again when done.
          </p>
          {items.map((item, idx) => (
            <div
              key={item.id}
              data-drag-row
              className={[
                draggingKey === item.id
                  ? 'relative z-10 rounded-2xl shadow-lg ring-1 ring-accent/40'
                  : isDragging
                    ? 'transition-transform duration-150 ease-out'
                    : '',
              ].join(' ')}
              style={getRowStyle(idx)}
            >
              <Card padding="sm" className="flex items-center gap-2">
                <button
                  type="button"
                  onPointerDown={(e) => startDrag(idx, e)}
                  className="flex shrink-0 touch-none cursor-grab select-none py-1 pl-0.5 pr-2 text-text-secondary active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                  aria-label={`Reorder ${exerciseName(item)}`}
                >
                  <DragGripIcon />
                </button>
                <span className="min-w-0 flex-1 truncate font-medium">{exerciseName(item)}</span>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Keep ExerciseBlocks mounted in reorder mode so local set/note state is not reset. */}
      <div
        className={reorderMode ? 'hidden' : 'flex flex-col gap-4'}
        aria-hidden={reorderMode}
      >
        {items.map((item) => (
          <ExerciseBlock
            key={item.id}
            ref={(el) => {
              exerciseRefs.current[item.id] = el
            }}
            workoutExerciseId={item.id}
            exerciseId={item.exercise_id}
            exerciseName={exerciseName(item)}
            exerciseType={item.exercise_type}
            initialSets={item.strength_sets}
            initialNote={item.session_note?.note_for_next_time ?? ''}
            initialCardio={item.cardio_entry ?? undefined}
            readOnly={blockReadOnly}
            persistenceMode={isEditing ? 'manual' : 'auto'}
            sessionNoteReadOnly={isCompleted}
            onDirty={isEditing ? () => setEditFormDirty(true) : undefined}
            collapseEnabled={!isCompleted}
            collapsed={collapsedIds.has(item.id)}
            onCollapsedChange={(next) => setExerciseCollapsed(item.id, next)}
            onRemove={
              showEditable
                ? () => handleRemoveExercise(item)
                : undefined
            }
            onSwap={
              showEditable
                ? (exerciseId) => handleSwapExercise(item, exerciseId)
                : undefined
            }
            swapExercises={showEditable ? allExercises : undefined}
            swapExcludeIds={showEditable ? alreadyAdded : undefined}
          />
        ))}
        {items.length === 0 && (
          <Card>
            <p className="text-text-secondary text-center">Add exercises to log your workout.</p>
          </Card>
        )}
      </div>

      {showEditable && !reorderMode && (
        <>
          <Button variant="secondary" fullWidth onClick={() => setShowPicker(!showPicker)}>
            {showPicker ? 'Cancel' : '+ Add exercise'}
          </Button>

          {showPicker && (
            <ExercisePickerPanel
              exercises={allExercises}
              excludeIds={alreadyAdded}
              onSelect={handleAddExercise}
              disabled={adding}
            />
          )}
        </>
      )}

      {isEditing && (
        <div className="flex flex-col gap-2">
          <Button fullWidth size="lg" onClick={openSaveEditConfirm} disabled={savingEdits}>
            {savingEdits ? 'Saving…' : 'Save changes'}
          </Button>
          {saveError && <p className="text-sm text-danger text-center">{saveError}</p>}
        </div>
      )}

      {!isCompleted && !reorderMode && items.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button fullWidth size="lg" onClick={openCompleteConfirm} disabled={completing}>
            {completing ? 'Finishing…' : 'Complete workout'}
          </Button>
          {completeError && (
            <p className="text-sm text-danger text-center">{completeError}</p>
          )}
        </div>
      )}

      {showCompleteConfirm && (
        <Modal
          title="Complete workout?"
          onClose={() => !completing && setShowCompleteConfirm(false)}
        >
          <p className="text-sm text-text-secondary">
            Mark this workout as finished? You can still view it in your history afterward.
          </p>
          {completeError && <p className="mt-2 text-sm text-danger text-center">{completeError}</p>}
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={completing}
              onClick={() => setShowCompleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button fullWidth disabled={completing} onClick={handleComplete}>
              {completing ? 'Finishing…' : 'Complete'}
            </Button>
          </div>
        </Modal>
      )}

      {showDiscardConfirm && (
        <Modal title="Discard workout?" onClose={() => !discarding && setShowDiscardConfirm(false)}>
          <p className="text-sm text-text-secondary">
            Discard this workout and all logged exercises? This cannot be undone.
          </p>
          {discardError && <p className="mt-2 text-sm text-danger text-center">{discardError}</p>}
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={discarding}
              onClick={() => setShowDiscardConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth disabled={discarding} onClick={confirmDiscard}>
              {discarding ? 'Discarding…' : 'Discard'}
            </Button>
          </div>
        </Modal>
      )}

      {showSaveEditConfirm && (
        <Modal
          title="Save changes?"
          onClose={() => !savingEdits && setShowSaveEditConfirm(false)}
        >
          <p className="text-sm text-text-secondary">
            Update this workout? Your stats, streaks, and personal records will reflect the
            corrected data.
          </p>
          {saveError && <p className="mt-2 text-sm text-danger text-center">{saveError}</p>}
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={savingEdits}
              onClick={() => setShowSaveEditConfirm(false)}
            >
              Cancel
            </Button>
            <Button fullWidth disabled={savingEdits} onClick={confirmSaveEdits}>
              {savingEdits ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Modal>
      )}

      {showCancelEditConfirm && (
        <Modal
          title="Discard changes?"
          onClose={() => !savingEdits && setShowCancelEditConfirm(false)}
        >
          <p className="text-sm text-text-secondary">
            Discard your unsaved edits to this workout?
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowCancelEditConfirm(false)}
            >
              Keep editing
            </Button>
            <Button variant="danger" fullWidth onClick={confirmCancelEdit}>
              Discard
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
