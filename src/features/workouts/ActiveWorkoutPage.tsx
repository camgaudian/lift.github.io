import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchWorkout,
  addExerciseToWorkout,
  completeWorkout,
  cancelWorkout,
} from './workoutApi'
import { ExerciseBlock, handleRemoveExercise, type ExerciseBlockHandle } from './ExerciseBlock'
import { useExercises } from '@/features/exercises/useExercises'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ExercisePickerPanel } from '@/features/exercises/ExercisePicker'
import { WorkoutFunStatsSection } from './WorkoutFunStatsSection'
import { SaveEntriesNotice } from './SaveEntriesNotice'
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

  const handleCancel = async () => {
    if (!id || !confirm('Discard this workout?')) return
    await cancelWorkout(id)
    navigate('/')
  }

  if (loading) return <LoadingSpinner />

  const isCompleted = workout?.status === 'completed'
  const alreadyAdded = new Set(items.map((i) => i.exercise_id))

  if (showCompletionSummary) {
    return (
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center gap-5 py-6">
        <h1 className="text-2xl font-semibold">Workout complete!</h1>
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
          <button type="button" onClick={handleCancel} className="shrink-0 text-sm text-danger">
            Discard
          </button>
        )}
      </div>

      {isCompleted && (
        <WorkoutFunStatsSection exercises={items} />
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

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <ExerciseBlock
            key={item.id}
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
                : () => handleRemoveExercise(item.id, reload)
            }
          />
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
    </div>
  )
}
