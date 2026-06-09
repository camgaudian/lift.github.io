import { MusicPlayingIcon } from '@/components/MusicPlayingIcon'
import { trackTextFadeClass } from '@/lib/ui'
import type { NowPlaying } from '@/lib/types'

export function FriendNowPlayingInline({
  nowPlaying,
  accentColor,
}: {
  nowPlaying: NowPlaying
  accentColor: string
}) {
  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
      <MusicPlayingIcon className="shrink-0" accentColor={accentColor} />
      <p className={`min-w-0 flex-1 text-xs text-text-secondary ${trackTextFadeClass}`}>
        {nowPlaying.title} · {nowPlaying.artist}
      </p>
    </div>
  )
}
