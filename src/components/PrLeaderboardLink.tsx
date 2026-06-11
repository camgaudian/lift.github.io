import { Link } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import type { NavTab } from '@/lib/nav'

function PodiumIcon() {
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
      <path d="M3 21V11h6v10M9 21V5h6v16M15 21V14h6v7" />
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

export function PrLeaderboardLink({ from }: { from: NavTab }) {
  const { accentColor } = useTheme()

  return (
    <Link
      to="/pr-leaderboard"
      state={{ navFrom: from }}
      className="inline-flex w-full min-h-[52px] items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-opacity hover:opacity-90 active:opacity-80"
      style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
    >
      <PodiumIcon />
      <span className="flex-1">PR Leaderboard</span>
      <ChevronIcon />
    </Link>
  )
}
