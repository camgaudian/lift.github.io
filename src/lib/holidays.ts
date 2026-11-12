import { useSyncExternalStore } from 'react'

export type Holiday = 'thanksgiving' | 'christmas' | 'newyear'

const HOLIDAYS: readonly Holiday[] = ['thanksgiving', 'christmas', 'newyear']
const ENABLED_KEY = 'lift:holiday-decorations'
const OVERRIDE_KEY = 'lift:holiday-override'

/** US Thanksgiving: the fourth Thursday of November. */
export function thanksgivingDay(year: number): number {
  const firstWeekday = new Date(year, 10, 1).getDay()
  const firstThursday = 1 + ((4 - firstWeekday + 7) % 7)
  return firstThursday + 21
}

/**
 * Which holiday's decorations to show on this date:
 * Thanksgiving Nov 15 – Thanksgiving Day, Christmas Dec 1–26, New Year's Dec 27 – Jan 2.
 */
export function holidayForDate(date: Date): Holiday | null {
  const month = date.getMonth()
  const day = date.getDate()
  if (month === 10 && day >= 15 && day <= thanksgivingDay(date.getFullYear())) return 'thanksgiving'
  if (month === 11 && day <= 26) return 'christmas'
  if ((month === 11 && day >= 27) || (month === 0 && day <= 2)) return 'newyear'
  return null
}

/**
 * Preview a holiday outside its dates with `?holiday=christmas` (or `off`).
 * `?holiday=auto` clears it. Kept for the rest of the browser session.
 */
function readOverride(): Holiday | 'off' | null {
  try {
    const param = new URLSearchParams(window.location.search).get('holiday')
    if (param === 'auto') sessionStorage.removeItem(OVERRIDE_KEY)
    else if (param === 'off' || HOLIDAYS.includes(param as Holiday)) sessionStorage.setItem(OVERRIDE_KEY, param!)
    const stored = sessionStorage.getItem(OVERRIDE_KEY)
    if (stored === 'off' || HOLIDAYS.includes(stored as Holiday)) return stored as Holiday | 'off'
  } catch {
    // Storage blocked: fall back to the calendar.
  }
  return null
}

export function getActiveHoliday(now = new Date()): Holiday | null {
  const override = readOverride()
  if (override === 'off') return null
  return override ?? holidayForDate(now)
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isHolidayDecorEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== '0'
  } catch {
    return true
  }
}

export function setHolidayDecorEnabled(enabled: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0')
  } catch {
    // Not persisted; still update this session.
  }
  listeners.forEach((l) => l())
}

/** Whether seasonal decorations are turned on (Settings → Appearance). Per device. */
export function useHolidayDecorEnabled(): boolean {
  return useSyncExternalStore(subscribe, isHolidayDecorEnabled, () => true)
}

/** The holiday to decorate for right now, or null when off or out of season. */
export function useHoliday(): Holiday | null {
  const enabled = useHolidayDecorEnabled()
  return enabled ? getActiveHoliday() : null
}
