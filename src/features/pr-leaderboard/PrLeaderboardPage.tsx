import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { useProfile } from '@/contexts/ProfileContext'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { CustomExerciseMatchingNotice } from '@/features/pr-leaderboard/CustomExerciseMatchingNotice'
import { fetchPrLeaderboard } from '@/lib/stats'
import { navFromState, resolveNavFrom, setStoredNavFrom } from '@/lib/nav'
import { formatWeight } from '@/lib/units'
import type { PrLeaderboardEntry } from '@/lib/types'

export function PrLeaderboardPage() {
  const { unit } = useProfile()
  const location = useLocation()
  const navFrom = resolveNavFrom(location.state, 'home')
  const backTo = navFrom === 'progress' ? '/progress' : '/'
  const backLabel = navFrom === 'progress' ? 'Back to progress' : 'Back to home'
  const [entries, setEntries] = useState<PrLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const from = navFromState(location.state) ?? 'home'
    setStoredNavFrom(from)
  }, [location.state])

  useEffect(() => {
    fetchPrLeaderboard()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="flex items-center gap-3">
        <BackButton to={backTo} label={backLabel} />
        <h1 className="text-2xl font-semibold">PR Leaderboard</h1>
      </div>

      <CustomExerciseMatchingNotice />

      <section>
        <h2 className="mb-2 text-sm font-medium text-text-secondary">Your PRs</h2>

        {loading ? (
          <LoadingSpinner size="section" />
        ) : entries.length === 0 ? (
          <p className="text-sm text-text-secondary">Complete workouts to see PRs.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry, i) => (
              <Link
                key={entry.exercise_id}
                to={`/pr-leaderboard/${entry.exercise_slug}`}
                state={{ navFrom }}
              >
                <Card padding="sm" className="transition-colors hover:bg-surface-secondary">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary text-sm">#{i + 1}</span>
                        <span className="font-medium truncate">{entry.exercise_name}</span>
                        {entry.friend_count > 0 && (
                          <span className="shrink-0 text-xs font-medium text-accent">
                            + {entry.friend_count} {entry.friend_count === 1 ? 'friend' : 'friends'}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {formatWeight(entry.best_weight_lb, unit)} × {entry.best_reps}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
