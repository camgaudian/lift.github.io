import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { fetchFriendSummary } from '@/features/profile/friendsApi'
import { shareExercise, shareTemplate, shareErrorMessage } from '@/features/sharing/sharingApi'
import { formatUsername } from '@/lib/format'
import type { FriendEntry, ShareKind } from '@/lib/types'

type RowState = { status: 'idle' | 'sharing' | 'shared'; error?: string }

export function FriendPickerModal({
  kind,
  itemId,
  itemName,
  onClose,
}: {
  kind: ShareKind
  itemId: string
  itemName: string
  onClose: () => void
}) {
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [states, setStates] = useState<Record<string, RowState>>({})

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchFriendSummary()
      .then((summary) => active && setFriends(summary.friends))
      .catch(() => active && setFriends([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const handleShare = async (friend: FriendEntry) => {
    setStates((prev) => ({ ...prev, [friend.user_id]: { status: 'sharing' } }))
    try {
      const result =
        kind === 'exercise'
          ? await shareExercise(friend.user_id, itemId)
          : await shareTemplate(friend.user_id, itemId)
      if (result.ok) {
        setStates((prev) => ({ ...prev, [friend.user_id]: { status: 'shared' } }))
      } else {
        setStates((prev) => ({
          ...prev,
          [friend.user_id]: {
            status: 'idle',
            error: shareErrorMessage(result.error, friend.display_name),
          },
        }))
      }
    } catch {
      setStates((prev) => ({
        ...prev,
        [friend.user_id]: { status: 'idle', error: 'Failed to share.' },
      }))
    }
  }

  return (
    <Modal title={`Share "${itemName}"`} onClose={onClose} showCloseButton scrollable>
      <p className="text-sm text-text-secondary">Choose a friend to share with.</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="inline" />
        </div>
      ) : friends.length === 0 ? (
        <p className="px-1 py-6 text-sm text-text-secondary text-center">
          Add friends to start sharing.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {friends.map((friend) => {
            const state = states[friend.user_id] ?? { status: 'idle' }
            return (
              <li
                key={friend.user_id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-secondary"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {formatUsername(friend.display_name)}
                  </p>
                  {state.error && <p className="mt-0.5 text-xs text-danger">{state.error}</p>}
                </div>
                <Button
                  size="sm"
                  variant={state.status === 'shared' ? 'secondary' : 'primary'}
                  disabled={state.status !== 'idle'}
                  onClick={() => handleShare(friend)}
                >
                  {state.status === 'sharing'
                    ? 'Sharing…'
                    : state.status === 'shared'
                      ? 'Shared'
                      : 'Share'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
