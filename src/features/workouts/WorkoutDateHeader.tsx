import {
  format,
  formatDistanceToNow,
  isThisYear,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns'
import { Card } from '@/components/Card'
import { formatDuration } from '@/lib/format'
import type { Workout } from '@/lib/types'

function formatRelativeDay(iso: string): string {
  const date = parseISO(iso)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return formatDistanceToNow(date, { addSuffix: true })
}

function formatWorkoutDuration(startIso: string, endIso: string): string {
  const seconds = Math.max(
    0,
    Math.floor((parseISO(endIso).getTime() - parseISO(startIso).getTime()) / 1000),
  )
  return formatDuration(seconds)
}

function formatEndTime(startIso: string, endIso: string): string {
  const start = parseISO(startIso)
  const end = parseISO(endIso)
  if (format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')) {
    return format(end, 'EEE, MMM d · h:mm a')
  }
  return format(end, 'h:mm a')
}

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-accent"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function WorkoutDateHeader({ workout }: { workout: Workout }) {
  const started = parseISO(workout.started_at)
  const completedAt = workout.completed_at
  const dateLine = format(started, 'EEEE, MMMM d')
  const yearLabel = isThisYear(started) ? null : format(started, 'yyyy')
  const relativeLabel = formatRelativeDay(workout.started_at)

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10">
          <CalendarIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{dateLine}</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {[yearLabel, relativeLabel].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {completedAt && (
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
          <div>
            <p className="text-xs text-text-secondary">Started</p>
            <p className="mt-0.5 text-sm font-medium">{format(started, 'h:mm a')}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary">Duration</p>
            <p className="mt-0.5 text-sm font-medium text-accent">
              {formatWorkoutDuration(workout.started_at, completedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Finished</p>
            <p className="mt-0.5 text-sm font-medium">
              {formatEndTime(workout.started_at, completedAt)}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
