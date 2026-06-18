import { useRef, useState } from 'react'
import { AvatarImage } from '@/components/AvatarImage'
import { Modal } from '@/components/Modal'
import { FriendNoTrackInline } from '@/features/profile/FriendNoTrackInline'
import { FriendNowPlayingInline } from '@/features/profile/FriendNowPlayingInline'
import { getAvatarUrl } from '@/features/profile/avatarApi'
import { useClickOutside } from '@/hooks/useClickOutside'
import { formatUsername } from '@/lib/format'
import { REACTION_EMOJIS } from '@/lib/reactions'
import type { NowPlayingReaction } from '@/lib/types'

const MAX_STACK = 3

function ReactFaceIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}

/**
 * Compact overlapping stack of reaction emojis with a "+N" overflow pill.
 * Shows up to MAX_STACK emojis (one per reactor), newest first.
 */
export function ReactionStack({ reactions }: { reactions: NowPlayingReaction[] }) {
  if (reactions.length === 0) return null

  const visible = reactions.slice(0, MAX_STACK)
  const overflow = reactions.length - visible.length

  return (
    <div className="flex items-center">
      {visible.map((reaction, idx) => (
        <span
          key={reaction.reactor_id}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-sm shadow-sm"
          style={idx > 0 ? { marginLeft: '-0.4rem' } : undefined}
        >
          {reaction.emoji}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="flex h-6 min-w-6 items-center justify-center rounded-full border border-border bg-surface-secondary px-1.5 text-xs font-medium text-text-secondary shadow-sm"
          style={{ marginLeft: '-0.4rem' }}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}

/**
 * Emoji picker popover for reacting to a friend's track. `current` highlights
 * the reactor's existing choice; selecting it again removes it (handled by the
 * caller via the toggling RPC).
 */
export function ReactionPicker({
  current,
  disabled,
  onSelect,
}: {
  current?: string | null
  disabled?: boolean
  onSelect: (emoji: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useClickOutside(containerRef, () => setOpen(false), open)

  return (
    <div ref={containerRef} className="relative flex shrink-0 items-center justify-center">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label="React to this track"
        aria-expanded={open}
        className={[
          'flex h-9 items-center justify-center gap-1 rounded-xl border border-border px-2.5 text-sm font-medium transition-colors disabled:opacity-50',
          current ? 'bg-accent/10 text-text' : 'text-text-secondary hover:bg-surface-secondary hover:text-text',
        ].join(' ')}
      >
        {current ? <span className="text-base leading-none">{current}</span> : <ReactFaceIcon />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 flex gap-1 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji)
                setOpen(false)
              }}
              aria-label={`React with ${emoji}`}
              className={[
                'flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 active:scale-95',
                current === emoji ? 'bg-accent/15' : 'hover:bg-surface-secondary',
              ].join(' ')}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Dismissible, scrollable list of who reacted with which emoji. */
export function ReactionsListModal({
  reactions,
  onClose,
}: {
  reactions: NowPlayingReaction[]
  onClose: () => void
}) {
  return (
    <Modal title="Reactions" onClose={onClose} showCloseButton scrollable>
      {reactions.length === 0 ? (
        <p className="text-sm text-text-secondary">No reactions yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {reactions.map((reaction) => (
          <li
            key={reaction.reactor_id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: `${reaction.accent_color}18` }}
          >
            <AvatarImage
              avatarUrl={reaction.avatar_path ? getAvatarUrl(reaction.avatar_path) : null}
              displayName={reaction.display_name}
              accentColor={reaction.accent_color}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {formatUsername(reaction.display_name)}
              </p>
                {reaction.now_playing ? (
                  <FriendNowPlayingInline
                    nowPlaying={reaction.now_playing}
                    accentColor={reaction.accent_color}
                  />
                ) : (
                  <FriendNoTrackInline accentColor={reaction.accent_color} />
                )}
              </div>
              <span className="shrink-0 text-xl leading-none">{reaction.emoji}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
