import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { cancelWorkout, fetchCompletedWorkouts } from '@/features/workouts/workoutApi'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Skeleton, SkeletonGroup } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'
import { TrashIcon } from '@/components/TrashIcon'
import { iconDeleteButtonClass } from '@/lib/ui'
import type { Workout } from '@/lib/types'

const RECENT_LIMIT = 3

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function HistorySkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-5" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </Card>
      <section>
        <Skeleton className="mb-2 h-4 w-32" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    </SkeletonGroup>
  )
}

export function HistorySection({
  showAllRecent,
  onShowAllRecentChange,
}: {
  showAllRecent: boolean
  onShowAllRecentChange: (open: boolean) => void
}) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetchCompletedWorkouts().then((w) => {
      setWorkouts(w)
      setLoading(false)
    })
  }, [])

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const workoutDates = new Set(
    workouts.map((w) => format(parseISO(w.completed_at!), 'yyyy-MM-dd')),
  )

  const filtered = selectedDate
    ? workouts.filter((w) => isSameDay(parseISO(w.completed_at!), selectedDate))
    : showAllRecent
      ? workouts
      : workouts.slice(0, RECENT_LIMIT)

  const hasMoreRecent = !selectedDate && workouts.length > RECENT_LIMIT

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await cancelWorkout(deleteTarget.id)
      setWorkouts((prev) => prev.filter((w) => w.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setDeleteError('Failed to delete workout.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <HistorySkeleton />

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
            className="text-accent px-2"
          >
            ‹
          </button>
          <span className="font-medium">{format(month, 'MMMM yyyy')}</span>
          <button
            type="button"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
            className="text-accent px-2"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const hasWorkout = workoutDates.has(key)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={[
                  'aspect-square rounded-lg text-sm flex items-center justify-center',
                  hasWorkout ? 'bg-accent text-white font-medium' : 'hover:bg-surface-secondary',
                  isSelected ? 'ring-2 ring-accent ring-offset-1' : '',
                ].join(' ')}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
        {selectedDate && (
          <button
            type="button"
            className="mt-2 text-sm text-accent"
            onClick={() => setSelectedDate(null)}
          >
            Clear filter
          </button>
        )}
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-medium text-text-secondary">
          {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Recent workouts'}
        </h2>
        <ul className="flex flex-col gap-2">
          {filtered.map((w) => (
            <li key={w.id}>
              <Card padding="sm" className="flex items-center gap-2 hover:border-accent/50 transition-colors">
                <Link to={`/workout/${w.id}`} className="min-w-0 flex-1">
                  <p className="font-medium">
                    {format(parseISO(w.completed_at!), 'EEE, MMM d · h:mm a')}
                  </p>
                  {w.template?.name && (
                    <p className="text-sm text-text-secondary truncate">{w.template.name}</p>
                  )}
                  {w.notes && <p className="text-sm text-text-secondary truncate">{w.notes}</p>}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null)
                    setDeleteTarget(w)
                  }}
                  className={iconDeleteButtonClass}
                  aria-label={`Delete workout from ${format(parseISO(w.completed_at!), 'MMM d, yyyy')}`}
                >
                  <TrashIcon />
                </button>
              </Card>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-text-secondary">No workouts for this period.</p>
          )}
        </ul>
        {hasMoreRecent && (
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-secondary/60 px-4 py-2.5 text-sm font-medium text-text transition-[border-color,background-color,filter] hover:border-accent/40 hover:bg-surface-secondary active:brightness-[0.97]"
            onClick={() => onShowAllRecentChange(!showAllRecent)}
          >
            <span>
              {showAllRecent
                ? 'Show less'
                : `Show older workouts (${workouts.length - RECENT_LIMIT} more)`}
            </span>
            <ChevronIcon expanded={showAllRecent} />
          </button>
        )}
      </section>

      {deleteTarget && (
        <Modal title="Delete workout?" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-sm text-text-secondary">
            Permanently delete this workout from{' '}
            {format(parseISO(deleteTarget.completed_at!), 'EEE, MMM d · h:mm a')}? This cannot be
            undone.
          </p>
          {deleteError && <p className="mt-2 text-sm text-danger text-center">{deleteError}</p>}
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth disabled={deleting} onClick={confirmDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
