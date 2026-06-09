import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { TrashIcon } from '@/components/TrashIcon'
import { iconDeleteButtonClass } from '@/lib/ui'
import { ExercisePickerPanel } from '@/features/exercises/ExercisePicker'
import { WorkoutFunStatsSection } from './WorkoutFunStatsSection'
import { WorkoutAchievementsSection } from './WorkoutAchievementsSection'
import { SaveEntriesNotice } from './SaveEntriesNotice'
import { useDragReorder, reorderList } from '@/lib/useDragReorder'
import type { Workout, WorkoutExercise } from '@/lib/types'

export function ActiveWorkoutPage() {
  const { id } = useParams<{ id: string }>()
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

  const handleDone = () => navigate('/history')

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

  const { listRef, draggingKey, isDragging, getLongPressProps, getRowStyle } = useDragReorder({
    keys: items.map((item) => item.id),
    onReorder: handleReorder,
    disabled: isCompleted,
  })

  if (loading) return <LoadingSpinner />
  const alreadyAdded = new Set(items.map((i) => i.exercise_id))

  if (showCompletionSummary) {
    return (
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center gap-5 py-6">
        <h1 className="text-2xl font-semibold">Workout complete!</h1>
        <WorkoutAchievementsSection workoutId={id} exercises={items} />
        <WorkoutFunStatsSection exercises={items} />
        <Button fullWidth size="lg" onClick={handleDone}>
          Done
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center gap-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="text-2xl font-semibold">{isCompleted ? 'Workout' : 'Active workout'}</h1>
          {!isCompleted && items.length > 0 && <SaveEntriesNotice />}
        </div>
        {!isCompleted && (
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
        )}
      </div>

      {isCompleted && (
        <>
          <WorkoutAchievementsSection workoutId={id} exercises={items} />
          <WorkoutFunStatsSection exercises={items} />
        </>
      )}

      {!isCompleted && (
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

      <div ref={listRef} className="flex flex-col gap-4">
        {items.map((item, idx) => (
          <div
            key={item.id}
            data-drag-row
            {...(!isCompleted ? getLongPressProps(idx) : {})}
            className={[
              draggingKey === item.id
                ? 'relative z-10 select-none rounded-2xl shadow-lg ring-1 ring-accent/40'
                : isDragging
                  ? 'transition-transform duration-150 ease-out'
                  : '',
            ].join(' ')}
            style={getRowStyle(idx)}
          >
            <ExerciseBlock
              ref={(el) => {
                exerciseRefs.current[item.id] = el
              }}
              workoutExerciseId={item.id}
              exerciseId={item.exercise_id}
              exerciseName={(item.exercise as { name: string } | undefined)?.name ?? 'Exercise'}
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
          </div>
        ))}
        {items.length === 0 && (
          <Card>
            <p className="text-text-secondary text-center">Add exercises to log your workout.</p>
          </Card>
        )}
      </div>

      {!isCompleted && items.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button fullWidth size="lg" onClick={handleComplete} disabled={completing}>
            {completing ? 'Finishing…' : 'Complete workout'}
          </Button>
          {completeError && (
            <p className="text-sm text-danger text-center">{completeError}</p>
          )}
        </div>
      )}

      {isCompleted && (
        <Button variant="secondary" fullWidth onClick={() => navigate('/history')}>
          Back to history
        </Button>
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
