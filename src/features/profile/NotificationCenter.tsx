import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { acceptFriendRequest, declineFriendRequest } from '@/features/profile/friendsApi'
import { acceptShare, dismissShare, fetchNotifications } from '@/features/sharing/sharingApi'
import { capitalize, formatUsername } from '@/lib/format'
import { useColorPopText } from '@/lib/ui'
import type { NotificationItem } from '@/lib/types'

function BellIcon() {
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
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(then).toLocaleDateString()
}

function describe(item: NotificationItem): string {
  switch (item.type) {
    case 'friend_request':
      return 'Sent a friend request'
    case 'exercise_share':
      return `Shared an exercise: ${item.payload.name}`
    case 'template_share':
      return `Shared a template: ${item.payload.name}`
  }
}

function NotificationDetail({
  item,
  pending,
  error,
  onPrimary,
  onSecondary,
  onClose,
}: {
  item: NotificationItem
  pending: boolean
  error: string | null
  onPrimary: () => void
  onSecondary: () => void
  onClose: () => void
}) {
  const sender = formatUsername(item.sender_name)

  const titleByType = {
    friend_request: 'Friend request',
    exercise_share: 'Shared exercise',
    template_share: 'Shared template',
  } as const

  const primaryLabel = {
    friend_request: 'Accept',
    exercise_share: 'Add to library',
    template_share: 'Add to library',
  } as const

  const secondaryLabel = item.type === 'friend_request' ? 'Decline' : 'Dismiss'

  return (
    <Modal title={titleByType[item.type]} onClose={() => !pending && onClose()}>
      <p className="text-sm text-text-secondary">
        From <span className="font-medium text-text">{sender}</span>
      </p>

      {item.type === 'friend_request' && (
        <p className="mt-3 text-sm">
          {sender} wants to be your friend. Accepting lets you both see each other&apos;s workout
          data.
        </p>
      )}

      {item.type === 'exercise_share' && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-base font-medium">{item.payload.name}</p>
          <p className="text-sm text-text-secondary capitalize">
            {item.payload.exercise_type}
            {item.payload.category ? ` · ${item.payload.category}` : ''}
            {item.payload.equipment ? ` · ${item.payload.equipment}` : ''}
          </p>
          {item.payload.primary_muscles.length > 0 && (
            <p className="text-sm text-text-secondary">
              Muscles: {item.payload.primary_muscles.map(capitalize).join(', ')}
            </p>
          )}
          <p className="mt-1 text-xs text-text-secondary">
            Adds this exercise to your custom library.
          </p>
        </div>
      )}

      {item.type === 'template_share' && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-base font-medium">{item.payload.name}</p>
          {item.payload.exercises.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-xl border border-border p-3">
              {item.payload.exercises.map((ex, idx) => (
                <li key={`${ex.name}-${idx}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{ex.name}</span>
                  <span className="shrink-0 text-xs text-text-secondary capitalize">
                    {ex.exercise_type}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">This template has no exercises.</p>
          )}
          <p className="mt-1 text-xs text-text-secondary">
            Saved to your templates as{' '}
            <span className="font-medium">
              {item.payload.name} ({sender})
            </span>
            .
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger text-center">{error}</p>}

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" fullWidth disabled={pending} onClick={onSecondary}>
          {secondaryLabel}
        </Button>
        <Button fullWidth disabled={pending} onClick={onPrimary}>
          {pending ? 'Working…' : primaryLabel[item.type]}
        </Button>
      </div>
    </Modal>
  )
}

export function NotificationCenter({
  disabled,
  onFriendsChanged,
}: {
  disabled?: boolean
  onFriendsChanged?: () => void
}) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<NotificationItem | null>(null)
  const [pending, setPending] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const sectionTitleClass = useColorPopText('text-text-secondary')

  const load = useCallback(async () => {
    if (disabled) {
      setItems([])
      setUnreadCount(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await fetchNotifications()
      setItems(result.items)
      setUnreadCount(result.unread_count)
    } catch {
      setItems([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [disabled])

  useEffect(() => {
    load()
  }, [load])

  const handlePrimary = async () => {
    if (!selected) return
    setPending(true)
    setDetailError(null)
    try {
      if (selected.type === 'friend_request') {
        await acceptFriendRequest(selected.id)
        onFriendsChanged?.()
      } else {
        const result = await acceptShare(selected.id)
        if (!result.ok) {
          setDetailError(
            result.error === 'duplicate_name'
              ? 'You already have an exercise with that name.'
              : 'Could not add this. It may no longer be available.',
          )
          return
        }
      }
      setSelected(null)
      await load()
    } catch {
      setDetailError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const handleSecondary = async () => {
    if (!selected) return
    setPending(true)
    setDetailError(null)
    try {
      if (selected.type === 'friend_request') {
        await declineFriendRequest(selected.id)
        onFriendsChanged?.()
      } else {
        await dismissShare(selected.id)
      }
      setSelected(null)
      await load()
    } catch {
      setDetailError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-accent">
          <BellIcon />
        </span>
        <h2 className={`text-sm font-medium ${sectionTitleClass}`}>Notifications</h2>
        {unreadCount > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      <Card padding="sm" className="p-0 overflow-hidden">
        {disabled ? (
          <p className="px-3.5 py-4 text-sm text-text-secondary text-center">
            Sign in to see notifications.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="inline" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-3.5 py-4 text-sm text-text-secondary text-center">No notifications.</p>
        ) : (
          <ul
            className={`flex flex-col gap-1.5 ${
              items.length > 3 ? 'max-h-60 overflow-y-auto overscroll-contain' : ''
            }`}
          >
            {items.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{formatUsername(item.sender_name)}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {describe(item)} · {formatRelativeTime(item.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setDetailError(null)
                    setSelected(item)
                  }}
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selected && (
        <NotificationDetail
          item={selected}
          pending={pending}
          error={detailError}
          onPrimary={handlePrimary}
          onSecondary={handleSecondary}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
