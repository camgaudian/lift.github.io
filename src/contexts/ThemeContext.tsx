import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { applyAppearance, DEFAULT_ACCENT } from '@/lib/theme'
import {
  fetchProfile,
  normalizeProfile,
  updateProfileAppearance,
} from '@/features/settings/profileApi'
import type { ThemeMode } from '@/lib/types'

interface ThemeContextValue {
  theme: ThemeMode
  accentColor: string
  colorPop: boolean
  loading: boolean
  setTheme: (theme: ThemeMode) => Promise<void>
  setAccentColor: (color: string) => Promise<void>
  setColorPop: (enabled: boolean) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT)
  const [colorPop, setColorPopState] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applyAppearance(theme, accentColor, colorPop)
  }, [theme, accentColor, colorPop])

  useEffect(() => {
    if (!user) {
      setThemeState('light')
      setAccentColorState(DEFAULT_ACCENT)
      setColorPopState(false)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchProfile(user.id)
      .then((profile) => {
        const prefs = normalizeProfile(profile)
        setThemeState(prefs.theme)
        setAccentColorState(prefs.accentColor)
        setColorPopState(prefs.colorPop)
      })
      .catch(() => {
        setThemeState('light')
        setAccentColorState(DEFAULT_ACCENT)
        setColorPopState(false)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const persist = useCallback(
    async (nextTheme: ThemeMode, nextAccent: string, nextColorPop: boolean) => {
      setThemeState(nextTheme)
      setAccentColorState(nextAccent)
      setColorPopState(nextColorPop)
      if (!user) return
      await updateProfileAppearance(user.id, nextTheme, nextAccent, nextColorPop)
    },
    [user],
  )

  const setTheme = useCallback(
    async (next: ThemeMode) => persist(next, accentColor, colorPop),
    [accentColor, colorPop, persist],
  )

  const setAccentColor = useCallback(
    async (next: string) => persist(theme, next, colorPop),
    [theme, colorPop, persist],
  )

  const setColorPop = useCallback(
    async (next: boolean) => persist(theme, accentColor, next),
    [theme, accentColor, persist],
  )

  return (
    <ThemeContext.Provider
      value={{ theme, accentColor, colorPop, loading, setTheme, setAccentColor, setColorPop }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
