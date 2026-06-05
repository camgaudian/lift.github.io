import type { ThemeMode } from '@/lib/types'

export type { ThemeMode }

export const DEFAULT_ACCENT = '#0071e3'

export const ACCENT_PRESETS = [
  { id: 'blue', label: 'Blue', color: '#0071e3' },
  { id: 'green', label: 'Green', color: '#34c759' },
  { id: 'orange', label: 'Orange', color: '#ff9500' },
  { id: 'purple', label: 'Purple', color: '#af52de' },
  { id: 'red', label: 'Red', color: '#ff3b30' },
  { id: 'teal', label: 'Teal', color: '#5ac8fa' },
] as const

export function darkenHex(hex: string, amount = 0.12): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const r = Math.max(0, Math.round(parseInt(normalized.slice(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.round(parseInt(normalized.slice(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.round(parseInt(normalized.slice(4, 6), 16) * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function applyAppearance(theme: ThemeMode, accentColor: string) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.setProperty('--color-accent', accentColor)
  root.style.setProperty('--color-accent-hover', darkenHex(accentColor))

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff')
  }
}
