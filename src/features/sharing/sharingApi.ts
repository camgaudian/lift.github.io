import { supabase } from '@/lib/supabase'
import type { NotificationsResult, ShareResult } from '@/lib/types'

export async function fetchNotifications(): Promise<NotificationsResult> {
  const { data, error } = await supabase.rpc('get_notifications')
  if (error) throw error
  const result = data as Partial<NotificationsResult>
  return {
    items: result.items ?? [],
    unread_count: result.unread_count ?? 0,
  }
}

export async function shareExercise(friendId: string, exerciseId: string): Promise<ShareResult> {
  const { data, error } = await supabase.rpc('share_exercise', {
    p_friend_id: friendId,
    p_exercise_id: exerciseId,
  })
  if (error) throw error
  return data as ShareResult
}

export async function shareTemplate(friendId: string, templateId: string): Promise<ShareResult> {
  const { data, error } = await supabase.rpc('share_template', {
    p_friend_id: friendId,
    p_template_id: templateId,
  })
  if (error) throw error
  return data as ShareResult
}

export async function acceptShare(shareId: string): Promise<ShareResult> {
  const { data, error } = await supabase.rpc('accept_share', { p_share_id: shareId })
  if (error) throw error
  return data as ShareResult
}

export async function dismissShare(shareId: string): Promise<void> {
  const { data, error } = await supabase.rpc('dismiss_share', { p_share_id: shareId })
  if (error) throw error
  const result = data as ShareResult
  if (!result.ok) throw new Error('error' in result ? result.error : 'Failed to dismiss')
}

export function shareErrorMessage(error: string, displayName?: string | null): string {
  const who = displayName ? `@${displayName}` : 'They'
  switch (error) {
    case 'not_friends':
      return 'You can only share with friends.'
    case 'not_owner':
      return 'You can only share your own custom items.'
    case 'duplicate_name':
      return `${who} already has an exercise with that name.`
    case 'already_pending':
      return 'Already shared and waiting for a response.'
    case 'not_found':
      return 'This share is no longer available.'
    default:
      return 'Failed to share.'
  }
}
