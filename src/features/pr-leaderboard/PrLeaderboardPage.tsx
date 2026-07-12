import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { BottomSheet } from '@/components/BottomSheet'
import {
  METAL_GRADIENTS,
  MILESTONE_BORDER_WIDTH,
  type MilestoneMetal,
} from '@/components/milestone-icons/MilestoneIcons'
import { useProfile } from '@/contexts/ProfileContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ExercisePrSheet } from '@/features/pr-leaderboard/ExercisePrSheet'
import { fetchPrLeaderboard, fetchExercisePrRankings } from '@/lib/stats'
import { navFromState, resolveNavFrom, setStoredNavFrom } from '@/lib/nav'
import { formatWeight } from '@/lib/units'
import type { PrLeaderboardEntry, ExercisePrRankingEntry } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

const RANK_METAL: Record<1 | 2 | 3, MilestoneMetal> = {
  1: 'gold',
  2: 'silver',
  3: 'bronze',
}

// ── Icons ────────────────────────────────────────────────────────────────────

function InfoCircleIcon() {
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
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}

function FriendsIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-secondary/50"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function MiniSpinner() {
  return (
    <div
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent"
      role="status"
      aria-label="Loading"
    />
  )
}

// ── Podium ───────────────────────────────────────────────────────────────────

const STEP_HEIGHT: Record<1 | 2 | 3, string> = {
  1: 'h-14',
  2: 'h-9',
  3: 'h-6',
}

function PodiumColumn({
  rank,
  entry,
  unit,
  isLoading,
  onClick,
}: {
  rank: 1 | 2 | 3
  entry: PrLeaderboardEntry
  unit: 'lb' | 'kg'
  isLoading?: boolean
  onClick: () => void
}) {
  const medal = MEDALS[rank - 1]
  const stepH = STEP_HEIGHT[rank]
  const metal = RANK_METAL[rank]

  return (
    <button
      className="flex min-w-0 flex-1 flex-col transition-opacity active:opacity-70"
      disabled={isLoading}
      onClick={onClick}
    >
      {/* Metal ring — same gradients as final milestone tiers (static; no shimmer) */}
      <div
        className="w-full rounded-xl"
        style={{
          background: METAL_GRADIENTS[metal],
          padding: MILESTONE_BORDER_WIDTH,
        }}
      >
        <div className="relative flex flex-col overflow-hidden rounded-[9px] bg-surface">
          {/* Card content */}
          <div className="relative flex flex-1 flex-col items-center px-2 pt-4 pb-3 text-center">
            <span className="text-2xl leading-none mb-2">{medal}</span>
            <p className="text-xs font-medium text-text w-full truncate px-1 leading-snug mb-1.5">
              {entry.exercise_name}
            </p>
            <p className="text-sm font-bold tabular-nums text-text">
              {formatWeight(entry.best_weight_lb, unit)} × {entry.best_reps}
            </p>
            {entry.friend_count > 0 && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                <FriendsIcon />
                {entry.friend_count}
              </span>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
                <MiniSpinner />
              </div>
            )}
          </div>
          {/* Podium step — taller for higher rank */}
          <div className={`w-full shrink-0 ${stepH} bg-border flex items-center justify-center`}>
            <span className="text-xs font-semibold text-text-secondary">#{rank}</span>
          </div>
          {rank === 1 && <span className="milestone-shine" />}
        </div>
      </div>
    </button>
  )
}

function PodiumHero({
  top3,
  unit,
  loadingSlug,
  onSelect,
}: {
  top3: PrLeaderboardEntry[]
  unit: 'lb' | 'kg'
  loadingSlug: string | null
  onSelect: (entry: PrLeaderboardEntry) => void
}) {
  const [first, second, third] = top3

  return (
    <div className="flex items-end gap-2">
      {second && (
        <PodiumColumn
          rank={2}
          entry={second}
          unit={unit}
          isLoading={loadingSlug === second.exercise_slug}
          onClick={() => onSelect(second)}
        />
      )}
      {first && (
        <PodiumColumn
          rank={1}
          entry={first}
          unit={unit}
          isLoading={loadingSlug === first.exercise_slug}
          onClick={() => onSelect(first)}
        />
      )}
      {third && (
        <PodiumColumn
          rank={3}
          entry={third}
          unit={unit}
          isLoading={loadingSlug === third.exercise_slug}
          onClick={() => onSelect(third)}
        />
      )}
    </div>
  )
}

// ── List row (rank 4+) ────────────────────────────────────────────────────────

function ExerciseRow({
  rank,
  entry,
  unit,
  isLoading,
  onClick,
}: {
  rank: number
  entry: PrLeaderboardEntry
  unit: 'lb' | 'kg'
  isLoading?: boolean
  onClick: () => void
}) {
  return (
    <button
      className="w-full text-left rounded-xl px-4 py-3 bg-surface transition-opacity active:opacity-70"
      disabled={isLoading}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-7 text-center text-sm text-text-secondary">#{rank}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{entry.exercise_name}</span>
            {entry.friend_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                <FriendsIcon />
                {entry.friend_count}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-text-secondary tabular-nums">
            {formatWeight(entry.best_weight_lb, unit)} × {entry.best_reps}
          </p>
        </div>

        {isLoading ? <MiniSpinner /> : <ChevronRightIcon />}
      </div>
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PrLeaderboardPage() {
  const { unit } = useProfile()
  const location = useLocation()
  const navFrom = resolveNavFrom(location.state, 'home')
  const backTo = navFrom === 'progress' ? '/progress' : '/'
  const backLabel = navFrom === 'progress' ? 'Back to progress' : 'Back to home'

  const [entries, setEntries] = useState<PrLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<PrLeaderboardEntry | null>(null)
  const [selectedRankings, setSelectedRankings] = useState<ExercisePrRankingEntry[]>([])
  const [noticeOpen, setNoticeOpen] = useState(false)

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

  function handleSelect(entry: PrLeaderboardEntry) {
    if (loadingSlug) return
    setLoadingSlug(entry.exercise_slug)
    fetchExercisePrRankings(entry.exercise_slug)
      .then((result) => {
        setSelectedRankings(result.rankings)
        setSelectedEntry(entry)
      })
      .catch(() => {
        setSelectedRankings([])
        setSelectedEntry(entry)
      })
      .finally(() => setLoadingSlug(null))
  }

  const showPodium = entries.length >= 4
  const top3 = showPodium ? entries.slice(0, 3) : []
  const rest = showPodium ? entries.slice(3) : entries

  return (
    <div className="flex flex-col gap-4 pt-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton to={backTo} label={backLabel} />
        <h1 className="flex-1 text-2xl font-semibold">PR leaderboard</h1>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent transition-opacity hover:opacity-70 active:opacity-50"
          aria-label="How exercises are matched with friends"
          onClick={() => setNoticeOpen(true)}
        >
          <InfoCircleIcon />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner size="section" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-secondary">Complete workouts to see PRs.</p>
      ) : (
        <>
          {showPodium && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-text-secondary">Top exercises</h2>
              <PodiumHero
                top3={top3}
                unit={unit}
                loadingSlug={loadingSlug}
                onSelect={handleSelect}
              />
            </section>
          )}

          <section>
            {showPodium && (
              <h2 className="mb-3 text-sm font-medium text-text-secondary">Your PRs</h2>
            )}
            <div className="flex flex-col gap-2">
              {rest.map((entry, i) => (
                <ExerciseRow
                  key={entry.exercise_id}
                  rank={showPodium ? i + 4 : i + 1}
                  entry={entry}
                  unit={unit}
                  isLoading={loadingSlug === entry.exercise_slug}
                  onClick={() => handleSelect(entry)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Exercise PR sheet — opens only after data is fetched */}
      {selectedEntry && (
        <ExercisePrSheet
          exerciseName={selectedEntry.exercise_name}
          rankings={selectedRankings}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {/* Notice sheet */}
      {noticeOpen && (
        <BottomSheet
          title="How custom exercises are matched"
          onClose={() => setNoticeOpen(false)}
          showCloseButton
        >
          <p className="pb-2 text-sm text-text-secondary leading-relaxed">
            Built-in exercises are matched by name (case-insensitive). Custom exercises are matched
            the same way, but a friend&apos;s custom exercise only appears if you also have a custom
            exercise with that name in your library.
          </p>
        </BottomSheet>
      )}
    </div>
  )
}
