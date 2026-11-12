import type { ThemeMode } from '@/lib/types'

export type { ThemeMode }

export const DEFAULT_ACCENT = '#0071e3'

export const ACCENT_PRESETS = [
  { id: 'blue', label: 'Blue', color: '#0071e3' },
  { id: 'green', label: 'Green', color: '#34c759' },
  { id: 'orange', label: 'Orange', color: '#ff9500' },
  { id: 'purple', label: 'Purple', color: '#af52de' },
  { id: 'pink', label: 'Pink', color: '#f9a8d4' },
  { id: 'teal', label: 'Teal', color: '#5ac8fa' },
] as const

export const BASE_NEUTRALS = {
  light: {
    surface: '#ffffff',
    surfaceSecondary: '#f5f5f7',
    border: '#e5e5ea',
  },
  dark: {
    surface: '#1c1c1e',
    surfaceSecondary: '#000000',
    border: '#38383a',
  },
} as const

/** Accent mix % for Color Pop surfaces (0 = neutral, 100 = full accent). Tune in src/lib/theme.ts. */
export const COLOR_POP_MIX = {
  light: { surface: 22, surfaceSecondary: 32, border: 38 },
  dark: { surface: 18, surfaceSecondary: 24, border: 30 },
} as const

export function darkenHex(hex: string, amount = 0.12): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const r = Math.max(0, Math.round(parseInt(normalized.slice(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.round(parseInt(normalized.slice(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.round(parseInt(normalized.slice(4, 6), 16) * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function mixHex(base: string, accent: string, percent: number): string {
  return `color-mix(in srgb, ${accent} ${percent}%, ${base})`
}

export function mixHexRgb(base: string, accent: string, percent: number): string {
  const baseNorm = base.replace('#', '')
  const accentNorm = accent.replace('#', '')
  if (baseNorm.length !== 6 || accentNorm.length !== 6) return base
  const ratio = percent / 100
  const blend = (baseChannel: number, accentChannel: number) =>
    Math.round(accentChannel * ratio + baseChannel * (1 - ratio))
  const r = blend(parseInt(baseNorm.slice(0, 2), 16), parseInt(accentNorm.slice(0, 2), 16))
  const g = blend(parseInt(baseNorm.slice(2, 4), 16), parseInt(accentNorm.slice(2, 4), 16))
  const b = blend(parseInt(baseNorm.slice(4, 6), 16), parseInt(accentNorm.slice(4, 6), 16))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function relativeLuminance(hex: string): number | null {
  const n = hex.replace('#', '')
  if (n.length !== 6) return null
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

/**
 * Two-tone shades derived from the user's accent (the logo's two colors).
 * Normal accents: deep = accent, soft = accent lifted toward white.
 * Already-light accents (pink, teal…): deep = darkened accent, soft = accent, so both stay visible.
 */
export function brandShades(accent: string): { deep: string; soft: string } {
  const lum = relativeLuminance(accent)
  if (lum === null) return { deep: accent, soft: accent }
  if (lum > 0.45) return { deep: darkenHex(accent, 0.3), soft: accent }
  return { deep: accent, soft: mixHexRgb(accent, '#ffffff', 45) }
}

export function applyAppearance(theme: ThemeMode, accentColor: string, colorPop = false) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.setProperty('--color-accent', accentColor)
  root.style.setProperty('--color-accent-hover', darkenHex(accentColor))
  const shades = brandShades(accentColor)
  root.style.setProperty('--color-accent-deep', shades.deep)
  root.style.setProperty('--color-accent-soft', shades.soft)

  const neutrals = BASE_NEUTRALS[theme]
  const mix = COLOR_POP_MIX[theme]

  if (colorPop) {
    root.dataset.colorPop = 'true'
    root.style.setProperty('--color-surface', mixHex(neutrals.surface, accentColor, mix.surface))
    root.style.setProperty(
      '--color-surface-secondary',
      mixHex(neutrals.surfaceSecondary, accentColor, mix.surfaceSecondary),
    )
    root.style.setProperty('--color-border', mixHex(neutrals.border, accentColor, mix.border))
  } else {
    delete root.dataset.colorPop
    root.style.removeProperty('--color-surface')
    root.style.removeProperty('--color-surface-secondary')
    root.style.removeProperty('--color-border')
  }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const themeColor = colorPop
      ? mixHexRgb(neutrals.surface, accentColor, mix.surface)
      : theme === 'dark'
        ? '#000000'
        : '#ffffff'
    meta.setAttribute('content', themeColor)
  }
}
