import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { fetchCompletedWorkouts } from '@/features/workouts/workoutApi'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Workout } from '@/lib/types'

export function HistorySection() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

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
    : workouts.slice(0, 20)

  if (loading) return <LoadingSpinner size="section" />

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
              <Link to={`/workout/${w.id}`}>
                <Card padding="sm" className="hover:border-accent/50 transition-colors">
                  <p className="font-medium">
                    {format(parseISO(w.completed_at!), 'EEE, MMM d · h:mm a')}
                  </p>
                  {w.template?.name && (
                    <p className="text-sm text-text-secondary truncate">{w.template.name}</p>
                  )}
                  {w.notes && <p className="text-sm text-text-secondary truncate">{w.notes}</p>}
                </Card>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-text-secondary">No workouts for this period.</p>
          )}
        </ul>
      </section>
    </div>
  )
}
