import { supabase } from '@/lib/supabase'
import type {
  NowPlaying,
  NowPlayingReaction,
  ReactToNowPlayingResult,
  SpotifySearchTrack,
} from '@/lib/types'

export async function fetchMyNowPlaying(): Promise<NowPlaying | null> {
  const { data, error } = await supabase.rpc('get_my_now_playing')
  if (error) throw error
  return (data as NowPlaying | null) ?? null
}

export async function setNowPlaying(track: SpotifySearchTrack): Promise<NowPlaying> {
  const { data, error } = await supabase.rpc('set_now_playing', {
    p_track_id: track.track_id,
    p_title: track.title,
    p_artist: track.artist,
    p_album_art_url: track.album_art_url ?? '',
  })
  if (error) throw error
  return data as NowPlaying
}

export async function clearNowPlaying(): Promise<void> {
  const { error } = await supabase.rpc('clear_now_playing')
  if (error) throw error
}

export async function fetchMyNowPlayingReactions(): Promise<NowPlayingReaction[]> {
  const { data, error } = await supabase.rpc('get_my_now_playing_reactions')
  if (error) throw error
  return (data as NowPlayingReaction[] | null) ?? []
}

export async function reactToNowPlaying(
  ownerId: string,
  emoji: string,
): Promise<ReactToNowPlayingResult> {
  const { data, error } = await supabase.rpc('react_to_now_playing', {
    p_owner_id: ownerId,
    p_emoji: emoji,
  })
  if (error) throw error
  return data as ReactToNowPlayingResult
}

export async function searchSpotifyTracks(query: string): Promise<SpotifySearchTrack[]> {
  const { data, error } = await supabase.functions.invoke('spotify-search', {
    body: { q: query },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return (data?.tracks ?? []) as SpotifySearchTrack[]
}

function hoursLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60)))
}

export function formatHoursLeft(expiresAt: string): string {
  const hours = hoursLeft(expiresAt)
  if (hours <= 0) return '0h left'
  if (hours === 1) return '1h left'
  return `${hours}h left`
}
