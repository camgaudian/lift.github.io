import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  fetchActiveWorkout,
  startEmptyWorkout,
  startWorkoutFromTemplate,
  createCompletedWorkout,
} from '@/features/workouts/workoutApi'
import { fetchTemplates } from '@/features/templates/templateApi'
import { AppIcon } from '@/components/AppIcon'
import { Button } from '@/components/Button'
import {
  fetchFunStats,
} from '@/lib/stats'
import { StartWorkoutModal } from '@/features/dashboard/StartWorkoutModal'
import { InstallBanner } from '@/features/dashboard/InstallBanner'
import { formatVolume } from '@/lib/format'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Skeleton, SkeletonGroup } from '@/components/Skeleton'
import { PrLeaderboardLink } from '@/components/PrLeaderboardLink'
import type { FunStats, WorkoutTemplate } from '@/lib/types'

export function DashboardPage() {
  const { unit, displayName, loading: profileLoading } = useProfile()
  const { accentColor } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [stats, setStats] = useState<FunStats | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<{ id: string } | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showPostLog, setShowPostLog] = useState(false)
  const [postStarted, setPostStarted] = useState('')
  const [postCompleted, setPostCompleted] = useState('')
  const [startingWorkout, setStartingWorkout] = useState(false)

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

  const handleStart = async (templateId?: string) => {
    setShowStartModal(false)
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

  if (loading) return <DashboardSkeleton />

  return (
    <div className="flex min-h-full flex-col justify-center gap-5 py-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <AppIcon size={26} color={accentColor} />
          <h1 className="text-2xl font-semibold">Lift</h1>
        </div>
        <Link
          to="/profile"
          className="text-sm font-medium text-text-secondary truncate max-w-[45%] shrink-0"
        >
          {profileLoading ? '…' : displayName ? `@${displayName}` : 'Set username'}
        </Link>
      </div>

      <InstallBanner />

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
        <>
          <Button fullWidth size="lg" onClick={() => setShowStartModal(true)}>
            Start workout
          </Button>
          {showStartModal && (
            <StartWorkoutModal
              templates={templates}
              onClose={() => setShowStartModal(false)}
              onStart={handleStart}
            />
          )}
        </>
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

function DashboardSkeleton() {
  return (
    <SkeletonGroup className="flex min-h-full flex-col justify-center gap-5 py-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[4.5rem] rounded-2xl" />
        <Skeleton className="h-[4.5rem] rounded-2xl" />
        <Skeleton className="col-span-2 h-[4.5rem] rounded-2xl" />
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
    </SkeletonGroup>
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
