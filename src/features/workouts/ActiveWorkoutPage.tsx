import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchWorkout,
  addExerciseToWorkout,
  completeWorkout,
  cancelWorkout,
} from './workoutApi'
import { ExerciseBlock, handleRemoveExercise } from './ExerciseBlock'
import { useExercises } from '@/features/exercises/useExercises'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import type { WorkoutExercise } from '@/lib/types'

export function ActiveWorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { exercises: allExercises } = useExercises()
  const [workoutStatus, setWorkoutStatus] = useState<string>('in_progress')
  const [items, setItems] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [completing, setCompleting] = useState(false)

  const reload = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { workout, exercises } = await fetchWorkout(id)
      setWorkoutStatus(workout.status)
      setItems(exercises)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [id])

  const handleAddExercise = async () => {
    if (!id || !selectedExercise) return
    const ex = allExercises.find((e) => e.id === selectedExercise)
    if (!ex) return
    await addExerciseToWorkout(id, ex.id, ex.exercise_type)
    setSelectedExercise('')
    setShowPicker(false)
    reload()
  }

  const handleComplete = async () => {
    if (!id) return
    setCompleting(true)
    try {
      await completeWorkout(id)
      navigate('/history')
    } finally {
      setCompleting(false)
    }
  }

  const handleCancel = async () => {
    if (!id || !confirm('Discard this workout?')) return
    await cancelWorkout(id)
    navigate('/workout')
  }

  if (loading) return <p className="text-text-secondary">Loading workout…</p>

  const isCompleted = workoutStatus === 'completed'
  const alreadyAdded = new Set(items.map((i) => i.exercise_id))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isCompleted ? 'Edit workout' : 'Active workout'}</h1>
        {!isCompleted && (
          <button type="button" onClick={handleCancel} className="text-sm text-danger">
            Discard
          </button>
        )}
      </div>

      {!isCompleted && (
        <>
          <Button variant="secondary" fullWidth onClick={() => setShowPicker(!showPicker)}>
            {showPicker ? 'Cancel' : '+ Add exercise'}
          </Button>

          {showPicker && (
            <Card className="flex flex-col gap-2">
              <select
                className="w-full rounded-xl border border-border bg-surface px-4 py-3"
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
              >
                <option value="">Select exercise…</option>
                {allExercises
                  .filter((e) => !alreadyAdded.has(e.id))
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
              </select>
              <Button onClick={handleAddExercise} disabled={!selectedExercise}>Add</Button>
            </Card>
          )}
        </>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <ExerciseBlock
            key={item.id}
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
        <Button fullWidth size="lg" onClick={handleComplete} disabled={completing}>
          {completing ? 'Finishing…' : 'Complete workout'}
        </Button>
      )}

      {isCompleted && (
        <Button variant="secondary" fullWidth onClick={() => navigate('/history')}>
          Back to history
        </Button>
      )}
    </div>
  )
}
