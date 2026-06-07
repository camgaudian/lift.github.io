import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  fetchFriendSummary,
  friendRequestErrorMessage,
  removeFriend,
  sendFriendRequest,
} from '@/features/profile/friendsApi'
import { FriendNowPlayingInline } from '@/features/profile/FriendNowPlayingInline'
import { PoweringLiftSection } from '@/features/profile/PoweringLiftSection'
import { fetchProfile, updateProfileSettings } from '@/features/settings/profileApi'
import { formatUsername } from '@/lib/format'
import { sectionHeadingClass } from '@/lib/ui'
import type { FriendEntry, FriendSummary, PendingFriendRequest } from '@/lib/types'

function SettingsGearLink() {
  return (
    <Link
      to="/profile/settings"
      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text"
    >
      <span>Settings</span>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    </Link>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { user } = useAuth()
  const { displayName, loading: profileLoading } = useProfile()
  const [summary, setSummary] = useState<FriendSummary>({ friends: [], incoming: [], outgoing: [] })
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [hideAddFriendWarning, setHideAddFriendWarning] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [showAddWarning, setShowAddWarning] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [unfriendTarget, setUnfriendTarget] = useState<FriendEntry | null>(null)
  const [unfriending, setUnfriending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const loadFriends = useCallback(async () => {
    if (!user) {
      setSummary({ friends: [], incoming: [], outgoing: [] })
      setFriendsLoading(false)
      return
    }

    setFriendsLoading(true)
    try {
      const [friendData, profile] = await Promise.all([
        fetchFriendSummary(),
        fetchProfile(user.id),
      ])
      setSummary(friendData)
      setHideAddFriendWarning(Boolean(profile?.hide_add_friend_warning))
    } catch {
      setActionError('Failed to load friends.')
    } finally {
      setFriendsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault()
    setAddError(null)
    const trimmed = usernameDraft.trim().replace(/^@+/, '')
    if (!trimmed) {
      setAddError('Enter a username.')
      return
    }
    if (hideAddFriendWarning) {
      void submitFriendRequest(trimmed)
    } else {
      setDontShowAgain(false)
      setShowAddWarning(true)
    }
  }

  const submitFriendRequest = async (username: string) => {
    setAdding(true)
    setAddError(null)
    try {
      const result = await sendFriendRequest(username)
      if (!result.ok) {
        setAddError(friendRequestErrorMessage(result.error))
        return
      }
      setUsernameDraft('')
      setShowAddWarning(false)
      await loadFriends()
    } catch {
      setAddError('Failed to send friend request.')
    } finally {
      setAdding(false)
    }
  }

  const confirmAddFriend = async () => {
    const trimmed = usernameDraft.trim().replace(/^@+/, '')
    if (!trimmed) return

    if (dontShowAgain && user) {
      await updateProfileSettings(user.id, { hide_add_friend_warning: true })
      setHideAddFriendWarning(true)
    }

    await submitFriendRequest(trimmed)
  }

  const handleAccept = async (request: PendingFriendRequest) => {
    setPendingActionId(request.request_id)
    setActionError(null)
    try {
      await acceptFriendRequest(request.request_id)
      await loadFriends()
    } catch {
      setActionError('Failed to accept request.')
    } finally {
      setPendingActionId(null)
    }
  }

  const handleDecline = async (request: PendingFriendRequest) => {
    setPendingActionId(request.request_id)
    setActionError(null)
    try {
      await declineFriendRequest(request.request_id)
      await loadFriends()
    } catch {
      setActionError('Failed to decline request.')
    } finally {
      setPendingActionId(null)
    }
  }

  const handleCancel = async (request: PendingFriendRequest) => {
    setPendingActionId(request.request_id)
    setActionError(null)
    try {
      await cancelFriendRequest(request.request_id)
      await loadFriends()
    } catch {
      setActionError('Failed to cancel request.')
    } finally {
      setPendingActionId(null)
    }
  }

  const confirmUnfriend = async () => {
    if (!unfriendTarget) return
    setUnfriending(true)
    setActionError(null)
    try {
      await removeFriend(unfriendTarget.user_id)
      setUnfriendTarget(null)
      await loadFriends()
    } catch {
      setActionError('Failed to unfriend.')
    } finally {
      setUnfriending(false)
    }
  }

  const hasPending = summary.incoming.length > 0 || summary.outgoing.length > 0

  return (
    <div className="flex flex-col gap-6 pt-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <SettingsGearLink />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className={sectionHeadingClass}>Username</h2>
        <Card padding="sm">
          <p className="text-base font-medium">
            {profileLoading ? '…' : displayName ? `@${displayName}` : 'Not set'}
          </p>
        </Card>
      </section>

      <PoweringLiftSection disabled={!user} />

      <section className="flex flex-col gap-2">
        <h2 className={sectionHeadingClass}>Friends</h2>

        <Card padding="sm" className="flex flex-col gap-3">
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
            <Input
              label="Add friend by username"
              placeholder="@username"
              autoComplete="off"
              value={usernameDraft}
              onChange={(e) => {
                setUsernameDraft(e.target.value.replace(/^@+/, ''))
                setAddError(null)
              }}
              disabled={adding || !user}
            />
            <Button type="submit" fullWidth disabled={adding || !user || !usernameDraft.trim()}>
              {adding ? 'Sending…' : 'Add friend'}
            </Button>
            {addError && <p className="text-sm text-danger text-center">{addError}</p>}
          </form>
        </Card>

        {friendsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="inline" />
          </div>
        ) : (
          <>
            {summary.friends.length === 0 && !hasPending ? (
              <Card padding="sm">
                <p className="text-sm text-text-secondary text-center">No friends yet.</p>
              </Card>
            ) : (
              summary.friends.length > 0 && (
                <Card padding="sm" className="p-0 overflow-hidden">
                  <ul className="divide-y divide-border">
                    {summary.friends.map((friend) => (
                      <li
                        key={friend.user_id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="shrink-0 text-sm font-medium">
                            {formatUsername(friend.display_name)}
                          </span>
                          {friend.now_playing && (
                            <FriendNowPlayingInline nowPlaying={friend.now_playing} />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-danger"
                          onClick={() => setUnfriendTarget(friend)}
                        >
                          Unfriend
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            )}

            {hasPending && (
              <div className="flex flex-col gap-2">
                <h3 className={`${sectionHeadingClass} mt-1`}>Pending</h3>
                <Card padding="sm" className="p-0 overflow-hidden">
                  <ul className="divide-y divide-border">
                    {summary.incoming.map((request) => (
                      <li key={request.request_id} className="px-3.5 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {formatUsername(request.display_name)}
                            </p>
                            <p className="text-xs text-text-secondary">Incoming request</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              size="sm"
                              disabled={pendingActionId === request.request_id}
                              onClick={() => handleAccept(request)}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={pendingActionId === request.request_id}
                              onClick={() => handleDecline(request)}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                    {summary.outgoing.map((request) => (
                      <li
                        key={request.request_id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {formatUsername(request.display_name)}
                          </p>
                          <p className="text-xs text-text-secondary">Request sent</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pendingActionId === request.request_id}
                          onClick={() => handleCancel(request)}
                        >
                          Cancel
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}
          </>
        )}

        {actionError && <p className="text-sm text-danger text-center">{actionError}</p>}
      </section>

      {showAddWarning && (
        <Modal title="Share workout data?" onClose={() => !adding && setShowAddWarning(false)}>
          <p className="text-sm text-text-secondary">
            Adding a friend lets them see your workout data once they accept. Only add people you
            trust.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              disabled={adding}
            />
            <span>Don&apos;t show this warning again</span>
          </label>
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={adding}
              onClick={() => setShowAddWarning(false)}
            >
              Cancel
            </Button>
            <Button fullWidth disabled={adding} onClick={confirmAddFriend}>
              {adding ? 'Sending…' : 'Add friend'}
            </Button>
          </div>
        </Modal>
      )}

      {unfriendTarget && (
        <Modal title="Unfriend?" onClose={() => !unfriending && setUnfriendTarget(null)}>
          <p className="text-sm text-text-secondary">
            Remove {formatUsername(unfriendTarget.display_name)} from your friends? They will no
            longer be able to see your workout data, and you won&apos;t see theirs.
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={unfriending}
              onClick={() => setUnfriendTarget(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth disabled={unfriending} onClick={confirmUnfriend}>
              {unfriending ? 'Removing…' : 'Unfriend'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
