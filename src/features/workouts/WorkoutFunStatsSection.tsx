import { useMemo } from 'react'
import { Card } from '@/components/Card'
import { CountUp } from '@/components/CountUp'
import { useProfile } from '@/contexts/ProfileContext'
import { formatDuration, formatVolume } from '@/lib/format'
import { formatWeight } from '@/lib/units'
import { computeWorkoutFunStats } from '@/lib/stats'
import type { WorkoutExercise } from '@/lib/types'

export function WorkoutFunStatsSection({
  exercises,
  animate = false,
}: {
  exercises: WorkoutExercise[]
  animate?: boolean
}) {
  const { unit } = useProfile()
  const stats = useMemo(() => computeWorkoutFunStats(exercises), [exercises])

  const cards: { label: string; value: number; format: (n: number) => string }[] = [
    { label: 'Exercises', value: stats.exercise_count, format: (n) => String(n) },
    { label: 'Sets', value: stats.total_sets, format: (n) => String(n) },
    { label: 'Reps', value: stats.total_reps, format: (n) => n.toLocaleString() },
    {
      label: 'Volume',
      value: stats.volume_lb,
      format: (n) => (n > 0 ? formatVolume(n, unit) : '—'),
    },
    {
      label: 'Cardio time',
      value: stats.total_cardio_seconds,
      format: (n) => (n > 0 ? formatDuration(n) : '—'),
    },
    {
      label: 'Heaviest rep',
      value: stats.heaviest_set_lb ?? 0,
      format: (n) => (n > 0 ? formatWeight(n, unit) : '—'),
    },
  ]

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-text-secondary">This workout</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Card key={c.label} padding="sm">
            <p className="text-xs text-text-secondary">{c.label}</p>
            <p className="mt-1 font-semibold">
              <CountUp value={c.value} format={c.format} animate={animate} />
            </p>
          </Card>
        ))}
      </div>
    </section>
  )
}
