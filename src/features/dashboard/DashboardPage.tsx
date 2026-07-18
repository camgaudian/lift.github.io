import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  fetchActiveWorkout,
  startEmptyWorkout,
  startWorkoutFromTemplate,
  createPastWorkoutShell,
} from '@/features/workouts/workoutApi'
import { fetchTemplates } from '@/features/templates/templateApi'
import { AppIcon } from '@/components/AppIcon'
import { Button } from '@/components/Button'
import {
  fetchFunStats,
} from '@/lib/stats'
import { StartWorkoutModal } from '@/features/dashboard/StartWorkoutModal'
import { UpdatesPopup } from '@/features/dashboard/UpdatesPopup'
import { UPDATES_POPUP_VERSION } from '@/features/dashboard/updatesContent'
import { fetchProfile } from '@/features/settings/profileApi'
import { InstallBanner } from '@/features/dashboard/InstallBanner'
import { formatVolume } from '@/lib/format'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Skeleton, SkeletonGroup } from '@/components/Skeleton'
import { PrLeaderboardLink } from '@/components/PrLeaderboardLink'
import { useColorPopText } from '@/lib/ui'
import type { FunStats, WorkoutTemplate } from '@/lib/types'

export function DashboardPage() {
  const { user } = useAuth()
  const { unit, displayName, loading: profileLoading } = useProfile()
  const { accentColor } = useTheme()
  const usernameClass = useColorPopText('text-text-secondary')
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
  const [showUpdatesPopup, setShowUpdatesPopup] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchFunStats(),
      fetchActiveWorkout(),
      fetchTemplates(),
      user ? fetchProfile(user.id) : Promise.resolve(null),
    ]).then(([s, active, tmpl, profile]) => {
      setStats(s)
      setActiveWorkout(active)
      setTemplates(tmpl)
      const lastSeen = profile?.last_seen_updates_version ?? 0
      setShowUpdatesPopup(lastSeen < UPDATES_POPUP_VERSION)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    const templateId = searchParams.get('template')
    if (!templateId || loading || activeWorkout) return

    setStartingWorkout(true)
    startWorkoutFromTemplate(templateId)
      .then((id) => navigate(`/workout/${id}`, { replace: true, state: { navFrom: 'home' } }))
      .finally(() => setStartingWorkout(false))
  }, [searchParams, loading, activeWorkout, navigate])

  const handleStart = async (templateId?: string) => {
    setShowStartModal(false)
    setStartingWorkout(true)
    try {
      const id = templateId
        ? await startWorkoutFromTemplate(templateId)
        : await startEmptyWorkout()
      navigate(`/workout/${id}`, { state: { navFrom: 'home' } })
    } finally {
      setStartingWorkout(false)
    }
  }

  const handlePostLog = async () => {
    if (!postStarted || !postCompleted || activeWorkout) return
    const w = await createPastWorkoutShell(new Date(postStarted).toISOString())
    navigate(`/workout/${w.id}`, {
      state: {
        navFrom: 'home',
        pendingCompletedAt: new Date(postCompleted).toISOString(),
      },
    })
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
          className={`text-sm font-medium truncate max-w-[45%] shrink-0 ${usernameClass}`}
        >
          {profileLoading ? '…' : displayName ? `@${displayName}` : 'Set username'}
        </Link>
      </div>

      <InstallBanner />

      <PrLeaderboardLink from="home" />

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
        <Button
          fullWidth
          size="lg"
          onClick={() => navigate(`/workout/${activeWorkout.id}`, { state: { navFrom: 'home' } })}
        >
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

      <Button
        variant="secondary"
        fullWidth
        onClick={() => setShowPostLog(!showPostLog)}
        disabled={!!activeWorkout}
      >
        {showPostLog ? 'Cancel post-log' : 'Log past workout'}
      </Button>

      {activeWorkout && (
        <p className="text-sm text-text-secondary text-center">
          Finish or discard your current workout before logging a past one.
        </p>
      )}

      {showUpdatesPopup && user && (
        <UpdatesPopup userId={user.id} onDismissed={() => setShowUpdatesPopup(false)} />
      )}

      {showPostLog && !activeWorkout && (
        <Card className="flex min-w-0 flex-col gap-3 overflow-hidden">
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
