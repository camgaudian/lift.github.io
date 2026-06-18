import { Link, useLocation } from 'react-router-dom'
import {
  getStoredNavFrom,
  isNavTabActive,
  navFromState,
  type NavTab,
} from '@/lib/nav'

const tabs: { to: string; id: NavTab; label: string; icon: typeof HomeIcon }[] = [
  { to: '/library', id: 'library', label: 'Library', icon: LibraryIcon },
  { to: '/history', id: 'history', label: 'History', icon: HistoryIcon },
  { to: '/', id: 'home', label: 'Home', icon: HomeIcon },
  { to: '/progress', id: 'progress', label: 'Progress', icon: ProgressIcon },
  { to: '/profile', id: 'profile', label: 'Profile', icon: ProfileIcon },
]

const TAB_COUNT = tabs.length

export function BottomNav() {
  const { pathname, state } = useLocation()
  const navFrom = navFromState(state) ?? getStoredNavFrom()

  const activeIndex = tabs.findIndex(({ id }) => isNavTabActive(id, pathname, navFrom))

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-5 pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
    >
      <nav className="liquid-glass-pill pointer-events-auto rounded-full p-1.5 w-full max-w-sm">
        {/* Inner flex wrapper is the positioning context for the indicator so
            percentages are relative to the tabs' actual area, not the padded pill */}
        <div className="relative flex">
          {activeIndex >= 0 && (
            <div
              aria-hidden="true"
              className="liquid-glass-indicator absolute top-0 bottom-0 my-auto rounded-full"
              style={{
                width: `calc(${100 / TAB_COUNT}% - 2px)`,
                height: '100%',
                left: `calc(${activeIndex * (100 / TAB_COUNT)}% + 1px)`,
                transition: 'left 320ms cubic-bezier(0.34, 1.4, 0.64, 1)',
              }}
            />
          )}

          {tabs.map(({ to, id, label, icon: Icon }) => {
            const active = isNavTabActive(id, pathname, navFrom)
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={[
                  'relative z-10 flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold leading-none transition-colors duration-150',
                  active ? 'text-accent' : 'text-text-secondary',
                ].join(' ')}
              >
                <Icon active={active} />
                <span className="mt-0.5">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    </svg>
  )
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <rect x="4" y="5" width="16" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10h16M8 3v4M16 3v4" strokeLinecap="round" strokeLinejoin="round" />
      {active && <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />}
    </svg>
  )
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  )
}
