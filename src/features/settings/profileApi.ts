import { supabase } from '@/lib/supabase'
import { DEFAULT_ACCENT } from '@/lib/theme'
import type { Profile, ThemeMode } from '@/lib/types'

export type { ThemeMode }

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateProfileAppearance(
  userId: string,
  theme: ThemeMode,
  accentColor: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ theme, accent_color: accentColor })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export function normalizeProfile(profile: Profile | null): {
  theme: ThemeMode
  accentColor: string
} {
  return {
    theme: profile?.theme === 'dark' ? 'dark' : 'light',
    accentColor: profile?.accent_color ?? DEFAULT_ACCENT,
  }
}
