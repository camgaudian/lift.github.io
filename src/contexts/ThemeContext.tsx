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
  loading: boolean
  setTheme: (theme: ThemeMode) => Promise<void>
  setAccentColor: (color: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applyAppearance(theme, accentColor)
  }, [theme, accentColor])

  useEffect(() => {
    if (!user) {
      setThemeState('light')
      setAccentColorState(DEFAULT_ACCENT)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchProfile(user.id)
      .then((profile) => {
        const prefs = normalizeProfile(profile)
        setThemeState(prefs.theme)
        setAccentColorState(prefs.accentColor)
      })
      .catch(() => {
        setThemeState('light')
        setAccentColorState(DEFAULT_ACCENT)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const persist = useCallback(
    async (nextTheme: ThemeMode, nextAccent: string) => {
      setThemeState(nextTheme)
      setAccentColorState(nextAccent)
      if (!user) return
      await updateProfileAppearance(user.id, nextTheme, nextAccent)
    },
    [user],
  )

  const setTheme = useCallback(
    async (next: ThemeMode) => persist(next, accentColor),
    [accentColor, persist],
  )

  const setAccentColor = useCallback(
    async (next: string) => persist(theme, next),
    [theme, persist],
  )

  return (
    <ThemeContext.Provider
      value={{ theme, accentColor, loading, setTheme, setAccentColor }}
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
