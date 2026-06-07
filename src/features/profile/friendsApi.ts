import { supabase } from '@/lib/supabase'
import type { FriendSummary, SendFriendRequestResult } from '@/lib/types'

export async function fetchFriendSummary(): Promise<FriendSummary> {
  const { data, error } = await supabase.rpc('get_friend_summary')
  if (error) throw error
  return data as FriendSummary
}

export async function sendFriendRequest(username: string): Promise<SendFriendRequestResult> {
  const { data, error } = await supabase.rpc('send_friend_request', {
    p_display_name: username.trim(),
  })
  if (error) throw error
  return data as SendFriendRequestResult
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { data, error } = await supabase.rpc('accept_friend_request', {
    p_request_id: requestId,
  })
  if (error) throw error
  const result = data as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? 'Failed to accept request')
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const { data, error } = await supabase.rpc('decline_friend_request', {
    p_request_id: requestId,
  })
  if (error) throw error
  const result = data as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? 'Failed to decline request')
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const { data, error } = await supabase.rpc('cancel_friend_request', {
    p_request_id: requestId,
  })
  if (error) throw error
  const result = data as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? 'Failed to cancel request')
}

export async function removeFriend(friendId: string): Promise<void> {
  const { data, error } = await supabase.rpc('remove_friend', {
    p_friend_id: friendId,
  })
  if (error) throw error
  const result = data as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? 'Failed to remove friend')
}

export function friendRequestErrorMessage(error: string): string {
  switch (error) {
    case 'not_found':
      return 'No account found with that username.'
    case 'self':
      return "You can't add yourself as a friend."
    case 'no_username':
      return "That user hasn't set a username yet."
    case 'already_friends':
      return 'You are already friends with this user.'
    case 'request_pending':
      return 'Friend request already sent.'
    default:
      return 'Failed to send friend request.'
  }
}
