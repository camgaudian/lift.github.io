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
import { getAvatarUrl } from '@/features/profile/avatarApi'
import type { WeightUnit } from '@/lib/types'

interface ProfileContextValue {
  displayName: string
  unit: WeightUnit
  avatarPath: string | null
  avatarUrl: string | null
  loading: boolean
  setDisplayName: (name: string) => Promise<void>
  setUnit: (unit: WeightUnit) => Promise<void>
  setAvatarUrl: (url: string | null) => void
  setAvatarPath: (path: string | null) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [displayName, setDisplayNameState] = useState('')
  const [unit, setUnitState] = useState<WeightUnit>('lb')
  const [avatarPath, setAvatarPathState] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setDisplayNameState('')
      setUnitState('lb')
      setAvatarPathState(null)
      setAvatarUrlState(null)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchProfile(user.id)
      .then((profile) => {
        const prefs = normalizeProfileSettings(profile)
        setDisplayNameState(prefs.displayName)
        setUnitState(prefs.unit)
        const path = profile?.avatar_path ?? null
        setAvatarPathState(path)
        setAvatarUrlState(path ? getAvatarUrl(path) : null)
      })
      .catch(() => {
        setDisplayNameState('')
        setUnitState('lb')
        setAvatarPathState(null)
        setAvatarUrlState(null)
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

  const setAvatarUrl = useCallback((url: string | null) => {
    setAvatarUrlState(url)
  }, [])

  const setAvatarPath = useCallback((path: string | null) => {
    setAvatarPathState(path)
    setAvatarUrlState(path ? getAvatarUrl(path) : null)
  }, [])

  return (
    <ProfileContext.Provider
      value={{
        displayName,
        unit,
        avatarPath,
        avatarUrl,
        loading,
        setDisplayName,
        setUnit,
        setAvatarUrl,
        setAvatarPath,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
