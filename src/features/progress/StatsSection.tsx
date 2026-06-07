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
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { PrLeaderboardLink } from '@/components/PrLeaderboardLink'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { FunStats, WeeklyVolume } from '@/lib/types'
import { format, parseISO } from 'date-fns'

export function StatsSection() {
  const { accentColor } = useTheme()
  const { unit } = useProfile()
  const [stats, setStats] = useState<FunStats | null>(null)
  const [weekVolume, setWeekVolume] = useState<(WeeklyVolume & { label: string })[]>([])
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
        setWeekVolume(
          wv.map((w) => ({
            ...w,
            label: format(parseISO(w.week_start), 'MMM d'),
          })),
        )
        setCumulative(cum)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner size="section" />

  const funCards = [
    { label: 'Total workouts', value: stats?.total_workouts ?? 0 },
    { label: 'Total sets', value: stats?.total_sets ?? 0 },
    { label: 'Total reps', value: (stats?.total_reps ?? 0).toLocaleString() },
    {
      label: 'Total cardio time',
      value: formatDuration(stats?.total_cardio_seconds ?? 0),
    },
    { label: 'Heaviest single set', value: stats?.heaviest_set_lb ? formatWeight(stats.heaviest_set_lb, unit) : '—' },
    { label: 'Current streak', value: `${stats?.streak_days ?? 0} days` },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PrLeaderboardLink />

      <section>
        <h2 className="mb-2 text-sm font-medium text-text-secondary">Fun numbers</h2>
        <div className="grid grid-cols-2 gap-3">
          {funCards.map((c) => (
            <Card key={c.label} padding="sm">
              <p className="text-xs text-text-secondary">{c.label}</p>
              <p className="mt-1 font-semibold">{c.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <h2 className="text-sm font-medium text-text-secondary mb-1">All-time volume</h2>
        <p className="text-3xl font-semibold">{formatVolume(cumulative, unit)}</p>
        <p className="text-xs text-text-secondary mt-1">
          Sum of reps × weight across all workouts ({unit})
        </p>
      </Card>

      {weekVolume.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Volume by week (12 wk)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekVolume}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={45} />
                <Tooltip
                  formatter={(value: number) => [formatVolume(value, unit), 'Volume']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text)',
                  }}
                  labelStyle={{ color: 'var(--color-text-secondary)' }}
                  itemStyle={{ color: accentColor }}
                />
                <Line
                  type="monotone"
                  dataKey="volume_lb"
                  stroke={accentColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

    </div>
  )
}
