import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchWorkout,
  addExerciseToWorkout,
  completeWorkout,
  cancelWorkout,
  reorderWorkoutExercises,
  removeWorkoutExercise,
} from './workoutApi'
import { ExerciseBlock, type ExerciseBlockHandle } from './ExerciseBlock'
import { useExercises } from '@/features/exercises/useExercises'
import { BackButton } from '@/components/BackButton'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Confetti } from '@/components/Confetti'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { DragGripIcon } from '@/components/DragGripIcon'
import { ReorderModeIcon } from '@/components/ReorderModeIcon'
import { TrashIcon } from '@/components/TrashIcon'
import { iconDeleteButtonClass, iconToolbarButtonClass } from '@/lib/ui'
import { ExercisePickerPanel } from '@/features/exercises/ExercisePicker'
import { WorkoutFunStatsSection } from './WorkoutFunStatsSection'
import { WorkoutAchievementsSection } from './WorkoutAchievementsSection'
import { SaveEntriesNotice } from './SaveEntriesNotice'
import { useDragReorder, reorderList } from '@/lib/useDragReorder'
import { navFromState, setStoredNavFrom } from '@/lib/nav'
import type { Workout, WorkoutExercise } from '@/lib/types'

export function ActiveWorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { exercises: allExercises } = useExercises()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [items, setItems] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showCompletionSummary, setShowCompletionSummary] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [discardError, setDiscardError] = useState<string | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
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
    const fromState = navFromState(location.state)
    if (fromState) {
      setStoredNavFrom(fromState)
      return
    }
    if (workout) {
      setStoredNavFrom(workout.status === 'completed' ? 'history' : 'home')
    }
  }, [location.state, workout?.status])

  // Celebratory haptic buzz when the completion summary appears (progressive
  // enhancement; iOS Safari ignores navigator.vibrate).
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
    setAdding(true)
    try {
      await addExerciseToWorkout(id, ex.id, ex.exercise_type)
      setShowPicker(false)
      reload()
    } finally {
      setAdding(false)
    }
  }

  const handleComplete = async () => {
    if (!id) return
    setCompleting(true)
    setCompleteError(null)
    try {
      await Promise.all(
        items.map((item) => exerciseRefs.current[item.id]?.save()),
      )
      await completeWorkout(id)
      const { workout: w, exercises } = await fetchWorkout(id)
      setWorkout(w)
      setItems(exercises)
      setShowCompletionSummary(true)
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Failed to complete workout')
    } finally {
      setCompleting(false)
    }
  }

  const handleDone = () => navigate('/history', { state: { navFrom: 'history' } })

  const confirmDiscard = async () => {
    if (!id) return
    setDiscarding(true)
    setDiscardError(null)
    try {
      await cancelWorkout(id)
      navigate('/')
    } catch {
      setDiscardError('Failed to discard workout.')
    } finally {
      setDiscarding(false)
    }
  }

  const isCompleted = workout?.status === 'completed'

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
        <div className="flex min-w-0 items-center gap-2.5">
          {isCompleted && (
            <BackButton to="/history" label="Back to history" state={{ navFrom: 'history' }} />
          )}
          <h1 className="text-2xl font-semibold">
            {isCompleted ? 'Workout' : reorderMode ? 'Reorder exercises' : 'Active workout'}
          </h1>
          {!isCompleted && !reorderMode && items.length > 0 && <SaveEntriesNotice />}
        </div>
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

      {isCompleted && (
        <>
          <WorkoutAchievementsSection workoutId={id} exercises={items} />
          <WorkoutFunStatsSection exercises={items} />
        </>
      )}

      {!isCompleted && !reorderMode && (
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

      {reorderMode ? (
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
      ) : (
        <div className="flex flex-col gap-4">
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
              readOnly={isCompleted}
              onRemove={
                isCompleted
                  ? undefined
                  : async () => {
                      await removeWorkoutExercise(item.id)
                      reload()
                    }
              }
            />
          ))}
          {items.length === 0 && (
            <Card>
              <p className="text-text-secondary text-center">Add exercises to log your workout.</p>
            </Card>
          )}
        </div>
      )}

      {!isCompleted && !reorderMode && items.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button fullWidth size="lg" onClick={handleComplete} disabled={completing}>
            {completing ? 'Finishing…' : 'Complete workout'}
          </Button>
          {completeError && (
            <p className="text-sm text-danger text-center">{completeError}</p>
          )}
        </div>
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
    </div>
  )
}
