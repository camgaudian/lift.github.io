import { supabase } from '@/lib/supabase'
import { DEFAULT_ACCENT } from '@/lib/theme'
import { normalizeUnit } from '@/lib/units'
import type { Profile, ThemeMode, WeightUnit, MilestoneCategoryId } from '@/lib/types'

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
  colorPop: boolean,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ theme, accent_color: accentColor, color_pop: colorPop })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProfileSettings(
  userId: string,
  updates: {
    display_name?: string | null
    unit_preference?: WeightUnit
    hide_add_friend_warning?: boolean
    featured_milestone_category?: MilestoneCategoryId | null
  },
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function isDisplayNameTaken(displayName: string, userId: string): Promise<boolean> {
  const normalized = displayName.trim()
  if (!normalized) return false

  const { data, error } = await supabase.rpc('is_display_name_taken', {
    p_display_name: normalized,
    p_user_id: userId,
  })
  if (error) throw error

  return Boolean(data)
}

export function normalizeProfileSettings(profile: Profile | null): {
  displayName: string
  unit: WeightUnit
} {
  return {
    displayName: profile?.display_name?.trim() ?? '',
    unit: normalizeUnit(profile?.unit_preference),
  }
}

export async function eraseAllWorkoutData(userId: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('user_id', userId)
  if (error) throw error
}

export function normalizeProfile(profile: Profile | null): {
  theme: ThemeMode
  accentColor: string
  colorPop: boolean
} {
  return {
    theme: profile?.theme === 'dark' ? 'dark' : 'light',
    accentColor: profile?.accent_color ?? DEFAULT_ACCENT,
    colorPop: profile?.color_pop ?? false,
  }
}
