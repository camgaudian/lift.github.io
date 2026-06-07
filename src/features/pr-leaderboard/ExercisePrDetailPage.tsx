import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { fetchExercisePrRankings } from '@/lib/stats'
import { formatUsername } from '@/lib/format'
import { formatWeight } from '@/lib/units'
import type { ExercisePrRankingEntry } from '@/lib/types'

export function ExercisePrDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { unit } = useProfile()
  const { accentColor } = useTheme()
  const [exerciseName, setExerciseName] = useState<string | null>(null)
  const [rankings, setRankings] = useState<ExercisePrRankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetchExercisePrRankings(slug)
      .then((result) => {
        setExerciseName(result.exercise_name)
        setRankings(result.rankings)
      })
      .catch(() => {
        setExerciseName(null)
        setRankings([])
      })
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="flex items-center gap-3">
        <Link
          to="/pr-leaderboard"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text"
          aria-label="Back to PR leaderboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-semibold truncate">
          {exerciseName ?? 'Exercise PRs'}
        </h1>
      </div>

      {loading ? (
        <LoadingSpinner size="section" />
      ) : !exerciseName ? (
        <p className="text-sm text-text-secondary">Exercise not found.</p>
      ) : rankings.length === 0 ? (
        <p className="text-sm text-text-secondary">No PR data for this exercise yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rankings.map((entry, i) => (
            <RankingRow
              key={entry.user_id}
              rank={i + 1}
              entry={entry}
              unit={unit}
              selfAccentColor={accentColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RankingRow({
  rank,
  entry,
  unit,
  selfAccentColor,
}: {
  rank: number
  entry: ExercisePrRankingEntry
  unit: 'lb' | 'kg'
  selfAccentColor: string
}) {
  const isSelf = entry.is_self

  if (isSelf) {
    return (
      <Card
        padding="sm"
        className="border-2"
        style={{ borderColor: selfAccentColor }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-text-secondary text-sm">#{rank}</span>
            <span className="font-medium truncate">{formatUsername(entry.display_name)}</span>
            <span className="text-xs text-text-secondary">(you)</span>
          </div>
          <p className="shrink-0 font-semibold">
            {formatWeight(entry.best_weight_lb, unit)} × {entry.best_reps}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="sm" style={{ backgroundColor: `${entry.accent_color}23` }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-text-secondary text-sm">#{rank}</span>
          <span className="font-medium truncate">{formatUsername(entry.display_name)}</span>
        </div>
        <p className="shrink-0 font-semibold">
          {formatWeight(entry.best_weight_lb, unit)} × {entry.best_reps}
        </p>
      </div>
    </Card>
  )
}
