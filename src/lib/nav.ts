export type NavTab = 'home' | 'history' | 'progress' | 'library' | 'profile'

export const NAV_FROM_STORAGE_KEY = 'lift:navFrom'

export type NavFromState = {
  navFrom?: NavTab
}

export function isNavTab(value: string | null | undefined): value is NavTab {
  return (
    value === 'home' ||
    value === 'history' ||
    value === 'progress' ||
    value === 'library' ||
    value === 'profile'
  )
}

export function navFromState(state: unknown): NavTab | null {
  if (!state || typeof state !== 'object') return null
  const from = (state as NavFromState).navFrom
  return isNavTab(from) ? from : null
}

export function getStoredNavFrom(): NavTab | null {
  if (typeof sessionStorage === 'undefined') return null
  const value = sessionStorage.getItem(NAV_FROM_STORAGE_KEY)
  return isNavTab(value) ? value : null
}

export function setStoredNavFrom(tab: NavTab) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(NAV_FROM_STORAGE_KEY, tab)
}

export function resolveNavFrom(state: unknown, fallback: NavTab = 'home'): NavTab {
  return navFromState(state) ?? getStoredNavFrom() ?? fallback
}

export function isNavTabActive(
  tab: NavTab,
  pathname: string,
  navFrom: NavTab | null,
): boolean {
  switch (tab) {
    case 'profile':
      return pathname.startsWith('/profile')
    case 'library':
      return pathname.startsWith('/library')
    case 'history':
      return pathname === '/history' || (pathname.startsWith('/workout/') && navFrom === 'history')
    case 'progress':
      return (
        pathname.startsWith('/progress') ||
        (pathname.startsWith('/pr-leaderboard') && navFrom === 'progress')
      )
    case 'home':
      return (
        pathname === '/' ||
        (pathname.startsWith('/workout/') && navFrom === 'home') ||
        (pathname.startsWith('/pr-leaderboard') && navFrom === 'home')
      )
    default:
      return false
  }
}
