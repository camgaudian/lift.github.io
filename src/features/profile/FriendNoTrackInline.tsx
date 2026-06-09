import { MusicIdleIcon } from '@/components/MusicIdleIcon'

export function FriendNoTrackInline({ accentColor }: { accentColor: string }) {
  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
      <MusicIdleIcon className="shrink-0" accentColor={accentColor} />
      <p className="text-xs text-text-secondary">No track set</p>
    </div>
  )
}
