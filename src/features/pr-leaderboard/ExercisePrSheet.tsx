import { BottomSheet } from '@/components/BottomSheet'
import { AvatarImage } from '@/components/AvatarImage'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getAvatarUrl } from '@/features/profile/avatarApi'
import { formatUsername } from '@/lib/format'
import { formatWeight } from '@/lib/units'
import type { ExercisePrRankingEntry } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

export function ExercisePrSheet({
  exerciseName,
  rankings,
  onClose,
}: {
  exerciseName: string
  rankings: ExercisePrRankingEntry[]
  onClose: () => void
}) {
  const { unit } = useProfile()
  const { accentColor } = useTheme()

  return (
    <BottomSheet title={exerciseName} onClose={onClose} scrollable showCloseButton>
      {rankings.length === 0 ? (
        <p className="pb-2 text-sm text-text-secondary">No PR data for this exercise yet.</p>
      ) : (
        <div className="flex flex-col gap-2 pb-2">
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
    </BottomSheet>
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
  const accentColor = isSelf ? selfAccentColor : entry.accent_color
  const medal = MEDALS[rank - 1]

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{
        backgroundColor: `${accentColor}20`,
        ...(isSelf ? { outline: `1.5px solid ${accentColor}50` } : {}),
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 w-7 text-center">
          {medal ? (
            <span className="text-base">{medal}</span>
          ) : (
            <span className="text-sm text-text-secondary">#{rank}</span>
          )}
        </span>
        <AvatarImage
          avatarUrl={entry.avatar_path ? getAvatarUrl(entry.avatar_path) : null}
          displayName={entry.display_name}
          accentColor={accentColor}
          size="sm"
        />
        <p className="font-medium truncate">
          {formatUsername(entry.display_name)}
          {isSelf && <span className="ml-1.5 text-xs text-text-secondary font-normal">(you)</span>}
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums">
        {formatWeight(entry.best_weight_lb, unit)} × {entry.best_reps}
      </p>
    </div>
  )
}
