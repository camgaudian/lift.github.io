import { useEffect, useState } from 'react'
import {
  fetchFunStats,
  fetchWeeklyVolume,
  fetchCumulativeVolume,
} from '@/lib/stats'
import { formatDuration, formatVolume } from '@/lib/format'
import { formatWeight } from '@/lib/units'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Card } from '@/components/Card'
import { CountUp } from '@/components/CountUp'
import { Skeleton, SkeletonGroup } from '@/components/Skeleton'
import { PrLeaderboardLink } from '@/components/PrLeaderboardLink'
import { WeeklyVolumeChart } from '@/features/progress/WeeklyVolumeChart'
import type { FunStats, WeeklyVolume } from '@/lib/types'

function StatsSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-4">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <section>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </section>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </SkeletonGroup>
  )
}

export function StatsSection() {
  const { accentColor } = useTheme()
  const { unit } = useProfile()
  const [stats, setStats] = useState<FunStats | null>(null)
  const [weekVolume, setWeekVolume] = useState<WeeklyVolume[]>([])
  const [cumulative, setCumulative] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchFunStats(),
      fetchWeeklyVolume(12),
      fetchCumulativeVolume(),
    ])
      .then(([s, wv, cum]) => {
        setStats(s)
        setWeekVolume(wv)
        setCumulative(cum)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <StatsSkeleton />

  const streakDays = stats?.streak_days ?? 0
  const streakUnit = streakDays === 1 ? 'day' : 'days'

  const funCards: { label: string; value: number; format: (n: number) => string }[] = [
    { label: 'Total workouts', value: stats?.total_workouts ?? 0, format: (n) => String(n) },
    { label: 'Total sets', value: stats?.total_sets ?? 0, format: (n) => String(n) },
    { label: 'Total reps', value: stats?.total_reps ?? 0, format: (n) => n.toLocaleString() },
    {
      label: 'Total cardio time',
      value: stats?.total_cardio_seconds ?? 0,
      format: (n) => (n > 0 ? formatDuration(n) : '—'),
    },
    {
      label: 'Heaviest single rep',
      value: stats?.heaviest_set_lb ?? 0,
      format: (n) => (n > 0 ? formatWeight(n, unit) : '—'),
    },
    {
      label: 'Current streak',
      value: streakDays,
      format: (n) => `${n} ${streakUnit}`,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PrLeaderboardLink from="progress" />

      <section>
        <div className="grid grid-cols-2 gap-3">
          {funCards.map((c) => (
            <Card key={c.label} padding="sm">
              <p className="text-xs text-text-secondary">{c.label}</p>
              <p className="mt-1 font-semibold">
                <CountUp value={c.value} format={c.format} animate />
              </p>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <h2 className="text-sm font-medium text-text-secondary mb-1">All-time volume</h2>
        <p className="text-3xl font-semibold">
          <CountUp
            value={cumulative}
            format={(n) => formatVolume(n, unit)}
            animate
          />
        </p>
        <p className="text-xs text-text-secondary mt-1">
          Sum of reps × weight across all workouts ({unit})
        </p>
      </Card>

      {weekVolume.length > 0 && (
        <Card>
          <WeeklyVolumeChart
            data={weekVolume}
            unit={unit}
            accentColor={accentColor}
          />
        </Card>
      )}

    </div>
  )
}
