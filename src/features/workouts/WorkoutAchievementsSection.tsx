import { useState } from 'react'
import { WorkoutAchievementsBanner } from './WorkoutAchievementsBanner'
import { WorkoutAchievementsModal } from './WorkoutAchievementsModal'
import { useWorkoutAchievements } from './useWorkoutAchievements'
import { hasWorkoutAchievements } from '@/lib/workoutAchievements'
import type { WorkoutExercise } from '@/lib/types'

export function WorkoutAchievementsSection({
  workoutId,
  exercises,
}: {
  workoutId?: string
  exercises: WorkoutExercise[]
}) {
  const [showModal, setShowModal] = useState(false)
  const { achievements } = useWorkoutAchievements(workoutId, exercises)

  if (!achievements || !hasWorkoutAchievements(achievements)) return null

  return (
    <>
      <WorkoutAchievementsBanner achievements={achievements} onClick={() => setShowModal(true)} />
      {showModal && (
        <WorkoutAchievementsModal
          achievements={achievements}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
