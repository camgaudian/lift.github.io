import { useEffect, useState } from 'react'
import {
  fetchWorkoutAchievements,
  hasWorkoutAchievements,
  type WorkoutAchievements,
} from '@/lib/workoutAchievements'
import type { WorkoutExercise } from '@/lib/types'

export function useWorkoutAchievements(
  workoutId: string | undefined,
  exercises: WorkoutExercise[],
) {
  const [achievements, setAchievements] = useState<WorkoutAchievements | null>(null)

  useEffect(() => {
    if (!workoutId) {
      setAchievements(null)
      return
    }

    let cancelled = false

    fetchWorkoutAchievements(workoutId, exercises)
      .then((result) => {
        if (!cancelled) setAchievements(result)
      })
      .catch(() => {
        if (!cancelled) setAchievements(null)
      })

    return () => {
      cancelled = true
    }
  }, [workoutId, exercises])

  return {
    achievements: hasWorkoutAchievements(achievements) ? achievements : null,
  }
}
