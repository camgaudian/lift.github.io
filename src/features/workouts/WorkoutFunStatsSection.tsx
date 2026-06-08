import { useMemo } from 'react'
import { Card } from '@/components/Card'
import { useProfile } from '@/contexts/ProfileContext'
import { formatDuration, formatVolume } from '@/lib/format'
import { formatWeight } from '@/lib/units'
import { computeWorkoutFunStats } from '@/lib/stats'
import type { WorkoutExercise } from '@/lib/types'

export function WorkoutFunStatsSection({
  exercises,
}: {
  exercises: WorkoutExercise[]
}) {
  const { unit } = useProfile()
  const stats = useMemo(() => computeWorkoutFunStats(exercises), [exercises])

  const cards = [
    { label: 'Exercises', value: stats.exercise_count },
    { label: 'Sets', value: stats.total_sets },
    { label: 'Reps', value: stats.total_reps.toLocaleString() },
    { label: 'Volume', value: stats.volume_lb > 0 ? formatVolume(stats.volume_lb, unit) : '—' },
    {
      label: 'Cardio time',
      value: stats.total_cardio_seconds > 0 ? formatDuration(stats.total_cardio_seconds) : '—',
    },
    {
      label: 'Heaviest rep',
      value: stats.heaviest_set_lb ? formatWeight(stats.heaviest_set_lb, unit) : '—',
    },
  ]

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-text-secondary">This workout</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Card key={c.label} padding="sm">
            <p className="text-xs text-text-secondary">{c.label}</p>
            <p className="mt-1 font-semibold">{c.value}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
