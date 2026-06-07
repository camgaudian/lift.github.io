import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import {
  fetchActiveWorkout,
  startEmptyWorkout,
  startWorkoutFromTemplate,
  createCompletedWorkout,
} from '@/features/workouts/workoutApi'
import { fetchTemplates } from '@/features/templates/templateApi'
import { Button } from '@/components/Button'
import {
  fetchFunStats,
} from '@/lib/stats'
import { formatVolume } from '@/lib/format'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { PrLeaderboardLink } from '@/components/PrLeaderboardLink'
import { useClickOutside } from '@/hooks/useClickOutside'
import type { FunStats, WorkoutTemplate } from '@/lib/types'

export function DashboardPage() {
  const { unit, displayName, loading: profileLoading } = useProfile()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [stats, setStats] = useState<FunStats | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<{ id: string } | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showStartMenu, setShowStartMenu] = useState(false)
  const [showPostLog, setShowPostLog] = useState(false)
  const [postStarted, setPostStarted] = useState('')
  const [postCompleted, setPostCompleted] = useState('')
  const [startingWorkout, setStartingWorkout] = useState(false)
  const startMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetchFunStats(),
      fetchActiveWorkout(),
      fetchTemplates(),
    ]).then(([s, active, tmpl]) => {
      setStats(s)
      setActiveWorkout(active)
      setTemplates(tmpl)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const templateId = searchParams.get('template')
    if (!templateId || loading || activeWorkout) return

    setStartingWorkout(true)
    startWorkoutFromTemplate(templateId)
      .then((id) => navigate(`/workout/${id}`, { replace: true }))
      .finally(() => setStartingWorkout(false))
  }, [searchParams, loading, activeWorkout, navigate])

  useClickOutside(startMenuRef, () => setShowStartMenu(false), showStartMenu && !startingWorkout)

  const handleStart = async (templateId?: string) => {
    setShowStartMenu(false)
    setStartingWorkout(true)
    try {
      const id = templateId
        ? await startWorkoutFromTemplate(templateId)
        : await startEmptyWorkout()
      navigate(`/workout/${id}`)
    } finally {
      setStartingWorkout(false)
    }
  }

  const handlePostLog = async () => {
    if (!postStarted || !postCompleted) return
    const w = await createCompletedWorkout(
      new Date(postStarted).toISOString(),
      new Date(postCompleted).toISOString(),
    )
    navigate(`/workout/${w.id}`)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center gap-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lift</h1>
        <Link
          to="/profile"
          className="text-sm font-medium text-text-secondary truncate max-w-[45%] shrink-0"
        >
          {profileLoading ? '…' : displayName ? `@${displayName}` : 'Set username'}
        </Link>
      </div>

      <PrLeaderboardLink />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Streak" value={`${stats?.streak_days ?? 0} days`} />
        <StatCard label="Workouts" value={String(stats?.total_workouts ?? 0)} />
        <StatCard label="All-time volume" value={formatVolume(stats?.cumulative_volume_lb ?? 0, unit)} className="col-span-2" />
      </div>

      {startingWorkout ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <LoadingSpinner size="inline" />
          <p className="text-sm text-text-secondary">Starting workout…</p>
        </div>
      ) : activeWorkout ? (
        <Button fullWidth size="lg" onClick={() => navigate(`/workout/${activeWorkout.id}`)}>
          Continue workout
        </Button>
      ) : (
        <div ref={startMenuRef} className="relative">
          <Button fullWidth size="lg" onClick={() => setShowStartMenu((open) => !open)}>
            Start workout
          </Button>
          {showStartMenu && (
            <Card padding="sm" className="absolute left-0 right-0 top-full z-10 mt-2 flex flex-col gap-1 shadow-lg">
              <button
                type="button"
                onClick={() => handleStart()}
                className="rounded-xl px-4 py-3 text-left text-base font-medium text-accent hover:bg-surface-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-lg leading-none">+</span>
                  Empty workout
                </span>
              </button>
              {templates.length > 0 && (
                <div role="separator" className="my-1 border-t border-border" />
              )}
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleStart(t.id)}
                  className="rounded-xl px-4 py-3 text-left text-base font-medium hover:bg-surface-secondary transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </Card>
          )}
        </div>
      )}

      <Button variant="secondary" fullWidth onClick={() => setShowPostLog(!showPostLog)}>
        {showPostLog ? 'Cancel post-log' : 'Log past workout'}
      </Button>

      {showPostLog && (
        <Card className="flex flex-col gap-3">
          <Input
            label="Started"
            type="datetime-local"
            value={postStarted}
            onChange={(e) => setPostStarted(e.target.value)}
          />
          <Input
            label="Completed"
            type="datetime-local"
            value={postCompleted}
            onChange={(e) => setPostCompleted(e.target.value)}
          />
          <Button onClick={handlePostLog} disabled={!postStarted || !postCompleted}>
            Create & add exercises
          </Button>
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
