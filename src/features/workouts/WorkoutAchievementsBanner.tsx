import { useTheme } from '@/contexts/ThemeContext'
import { formatAchievementsSummary, type WorkoutAchievements } from '@/lib/workoutAchievements'

function SparkleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
      <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function WorkoutAchievementsBanner({
  achievements,
  onClick,
}: {
  achievements: WorkoutAchievements
  onClick: () => void
}) {
  const { accentColor } = useTheme()
  const summary = formatAchievementsSummary(achievements)
  if (!summary) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full min-h-[52px] items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-opacity hover:opacity-90 active:opacity-80"
      style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
    >
      <SparkleIcon />
      <span className="flex-1 text-left">{summary}</span>
      <ChevronIcon />
    </button>
  )
}
