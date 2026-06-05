import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchProfile,
  normalizeProfileSettings,
  updateProfileSettings,
} from '@/features/settings/profileApi'
import type { WeightUnit } from '@/lib/types'

interface ProfileContextValue {
  displayName: string
  unit: WeightUnit
  loading: boolean
  setDisplayName: (name: string) => Promise<void>
  setUnit: (unit: WeightUnit) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [displayName, setDisplayNameState] = useState('')
  const [unit, setUnitState] = useState<WeightUnit>('lb')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setDisplayNameState('')
      setUnitState('lb')
      setLoading(false)
      return
    }

    setLoading(true)
    fetchProfile(user.id)
      .then((profile) => {
        const prefs = normalizeProfileSettings(profile)
        setDisplayNameState(prefs.displayName)
        setUnitState(prefs.unit)
      })
      .catch(() => {
        setDisplayNameState('')
        setUnitState('lb')
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const setDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!user) return
      await updateProfileSettings(user.id, { display_name: trimmed || null })
      setDisplayNameState(trimmed)
    },
    [user],
  )

  const setUnit = useCallback(
    async (next: WeightUnit) => {
      setUnitState(next)
      if (!user) return
      await updateProfileSettings(user.id, { unit_preference: next })
    },
    [user],
  )

  return (
    <ProfileContext.Provider value={{ displayName, unit, loading, setDisplayName, setUnit }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
