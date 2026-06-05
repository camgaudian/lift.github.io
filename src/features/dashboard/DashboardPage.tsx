import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { fetchActiveWorkout } from '@/features/workouts/workoutApi'
import { Button } from '@/components/Button'
import {
  fetchFunStats,
  fetchWeeklyVolume,
  fetchCumulativeVolume,
  fetchExercisePRs,
} from '@/lib/stats'
import { formatVolume } from '@/lib/format'
import { formatWeight } from '@/lib/units'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import type { ExercisePR, FunStats, WeeklyVolume } from '@/lib/types'
import { format, parseISO } from 'date-fns'

export function DashboardPage() {
  const { accentColor } = useTheme()
  const { unit } = useProfile()
  const [stats, setStats] = useState<FunStats | null>(null)
  const [weekVolume, setWeekVolume] = useState<WeeklyVolume[]>([])
  const [cumulative, setCumulative] = useState(0)
  const [topPr, setTopPr] = useState<ExercisePR | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchFunStats(),
      fetchWeeklyVolume(8),
      fetchCumulativeVolume(),
      fetchExercisePRs(),
      fetchActiveWorkout(),
    ]).then(([s, wv, cum, prs, active]) => {
      setStats(s)
      setWeekVolume(
        wv.map((w) => ({
          ...w,
          label: format(parseISO(w.week_start), 'MMM d'),
        })) as (WeeklyVolume & { label: string })[],
      )
      setCumulative(cum)
      setTopPr(prs[0] ?? null)
      setActiveWorkout(active)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center gap-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lift</h1>
        <Link to="/progress" className="text-sm text-accent font-medium">
          Progress →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Streak" value={`${stats?.streak_days ?? 0} days`} />
        <StatCard label="Workouts" value={String(stats?.total_workouts ?? 0)} />
        <StatCard label="All-time volume" value={formatVolume(cumulative, unit)} className="col-span-2" />
        {topPr && (
          <StatCard
            label="Top PR"
            value={`${topPr.exercise_name}: ${formatWeight(topPr.best_weight_lb, unit)} × ${topPr.best_reps}`}
            className="col-span-2"
          />
        )}
      </div>

      <Link to={activeWorkout ? `/workout/${activeWorkout.id}` : '/workout'} className="block">
        <Button fullWidth size="lg">
          {activeWorkout ? 'Continue workout' : 'Start workout'}
        </Button>
      </Link>

      {weekVolume.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Weekly volume</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekVolume}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => formatVolume(v, unit)} />
                <Bar dataKey="volume_lb" fill={accentColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <Card className={className}>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </Card>
  )
}
