import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import {
  fetchFunStats,
  fetchWeeklyVolume,
  fetchCumulativeVolume,
  fetchExercisePRs,
} from '@/lib/stats'
import { formatVolume } from '@/lib/format'
import { Card } from '@/components/Card'
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
  const { signOut } = useAuth()
  const [stats, setStats] = useState<FunStats | null>(null)
  const [weekVolume, setWeekVolume] = useState<WeeklyVolume[]>([])
  const [cumulative, setCumulative] = useState(0)
  const [topPr, setTopPr] = useState<ExercisePR | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchFunStats(),
      fetchWeeklyVolume(8),
      fetchCumulativeVolume(),
      fetchExercisePRs(),
    ]).then(([s, wv, cum, prs]) => {
      setStats(s)
      setWeekVolume(
        wv.map((w) => ({
          ...w,
          label: format(parseISO(w.week_start), 'MMM d'),
        })) as (WeeklyVolume & { label: string })[],
      )
      setCumulative(cum)
      setTopPr(prs[0] ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-text-secondary">Loading dashboard…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lift</h1>
        <div className="flex items-center gap-3">
          <Link to="/stats" className="text-sm text-accent font-medium">All stats →</Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Streak" value={`${stats?.streak_days ?? 0} days`} />
        <StatCard label="Workouts" value={String(stats?.total_workouts ?? 0)} />
        <StatCard label="All-time volume" value={formatVolume(cumulative)} className="col-span-2" />
        {topPr && (
          <StatCard
            label="Top PR (est. 1RM)"
            value={`${topPr.exercise_name}: ${Math.round(topPr.estimated_1rm_lb)} lb`}
            className="col-span-2"
          />
        )}
      </div>

      <Link to="/workout">
        <Card className="bg-accent text-white border-accent text-center py-5">
          <span className="text-lg font-semibold">Start workout</span>
        </Card>
      </Link>

      {weekVolume.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Weekly volume</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekVolume}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => formatVolume(v)} />
                <Bar dataKey="volume_lb" fill="#0071e3" radius={[4, 4, 0, 0]} />
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
