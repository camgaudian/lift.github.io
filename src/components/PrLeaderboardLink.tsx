import { Link } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'

function TrophyIcon() {
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
      <path d="M8 21h8M12 17v4M7 4h10l1 5a4 4 0 01-8 0l1-5zM5 4H3v2a3 3 0 003 3M19 4h2v2a3 3 0 01-3 3" />
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

export function PrLeaderboardLink() {
  const { accentColor } = useTheme()

  return (
    <Link
      to="/pr-leaderboard"
      className="inline-flex w-full min-h-[52px] items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-opacity hover:opacity-90 active:opacity-80"
      style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
    >
      <TrophyIcon />
      <span className="flex-1">PR Leaderboard</span>
      <ChevronIcon />
    </Link>
  )
}
