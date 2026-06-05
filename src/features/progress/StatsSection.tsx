import { useEffect, useState } from 'react'
import {
  fetchFunStats,
  fetchWeeklyVolume,
  fetchCumulativeVolume,
  fetchExercisePRs,
} from '@/lib/stats'
import { formatVolume } from '@/lib/format'
import { useTheme } from '@/contexts/ThemeContext'
import { Card } from '@/components/Card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ExercisePR, FunStats, WeeklyVolume } from '@/lib/types'
import { format, parseISO } from 'date-fns'

export function StatsSection() {
  const { accentColor } = useTheme()
  const [stats, setStats] = useState<FunStats | null>(null)
  const [weekVolume, setWeekVolume] = useState<(WeeklyVolume & { label: string })[]>([])
  const [cumulative, setCumulative] = useState(0)
  const [prs, setPrs] = useState<ExercisePR[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchFunStats(),
      fetchWeeklyVolume(12),
      fetchCumulativeVolume(),
      fetchExercisePRs(),
    ])
      .then(([s, wv, cum, prList]) => {
        setStats(s)
        setWeekVolume(
          wv.map((w) => ({
            ...w,
            label: format(parseISO(w.week_start), 'MMM d'),
          })),
        )
        setCumulative(cum)
        setPrs(prList)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-text-secondary">Loading stats…</p>

  const funCards = [
    { label: 'Total workouts', value: stats?.total_workouts ?? 0 },
    { label: 'Total sets', value: stats?.total_sets ?? 0 },
    { label: 'Total reps', value: (stats?.total_reps ?? 0).toLocaleString() },
    { label: 'Cumulative weight moved', value: formatVolume(stats?.cumulative_volume_lb ?? cumulative) },
    { label: 'Heaviest single set', value: stats?.heaviest_set_lb ? `${stats.heaviest_set_lb} lb` : '—' },
    { label: 'Current streak', value: `${stats?.streak_days ?? 0} days` },
  ]

  return (
    <div className="flex flex-col gap-4">
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
        <p className="text-3xl font-semibold">{formatVolume(cumulative)}</p>
        <p className="text-xs text-text-secondary mt-1">Sum of reps × weight across all workouts</p>
      </Card>

      {weekVolume.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Volume by week (12 wk)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekVolume}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={45} />
                <Tooltip formatter={(v: number) => formatVolume(v)} />
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

      <section>
        <h2 className="mb-2 text-sm font-medium text-text-secondary">PR leaderboard (est. 1RM)</h2>
        <div className="flex flex-col gap-2">
          {prs.slice(0, 20).map((pr, i) => (
            <Card key={pr.exercise_id} padding="sm">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-text-secondary text-sm mr-2">#{i + 1}</span>
                  <span className="font-medium">{pr.exercise_name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{Math.round(pr.estimated_1rm_lb)} lb est.</p>
                  <p className="text-xs text-text-secondary">
                    {pr.best_weight_lb} × {pr.best_reps}
                  </p>
                </div>
              </div>
            </Card>
          ))}
          {prs.length === 0 && (
            <p className="text-sm text-text-secondary">Complete workouts to see PRs.</p>
          )}
        </div>
      </section>
    </div>
  )
}
