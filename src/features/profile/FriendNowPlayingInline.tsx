import { MusicPlayingIcon } from '@/components/MusicPlayingIcon'
import { TrackArtwork } from '@/components/TrackArtwork'
import type { NowPlaying } from '@/lib/types'

export function FriendNowPlayingInline({ nowPlaying }: { nowPlaying: NowPlaying }) {
  return (
    <>
      <MusicPlayingIcon />
      {nowPlaying.album_art_url && (
        <TrackArtwork url={nowPlaying.album_art_url} size="sm" />
      )}
      <span className="min-w-0 truncate text-xs text-text-secondary">
        {nowPlaying.title} · {nowPlaying.artist}
      </span>
    </>
  )
}