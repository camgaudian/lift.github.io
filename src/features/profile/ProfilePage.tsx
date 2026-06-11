import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AddFriendIcon } from '@/components/AddFriendIcon'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Skeleton, SkeletonGroup } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'
import { TrackArtwork } from '@/components/TrackArtwork'
import { TrackArtworkPlaceholder } from '@/components/TrackArtworkPlaceholder'
import {
  cancelFriendRequest,
  fetchFriendSummary,
  friendRequestErrorMessage,
  removeFriend,
  sendFriendRequest,
} from '@/features/profile/friendsApi'
import { FriendNoTrackInline } from '@/features/profile/FriendNoTrackInline'
import { FriendNowPlayingInline } from '@/features/profile/FriendNowPlayingInline'
import { FriendProfileModal } from '@/features/profile/FriendProfileModal'
import { NotificationCenter } from '@/features/profile/NotificationCenter'
import { PoweringLiftSection } from '@/features/profile/PoweringLiftSection'
import { fetchProfile, updateProfileSettings } from '@/features/settings/profileApi'
import { formatUsername } from '@/lib/format'
import type { FriendEntry, FriendSummary, PendingFriendRequest } from '@/lib/types'

function FriendsIcon() {
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
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

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

export function ProfilePage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<FriendSummary>({ friends: [], incoming: [], outgoing: [] })
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [hideAddFriendWarning, setHideAddFriendWarning] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [showAddWarning, setShowAddWarning] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<FriendEntry | null>(null)
  const [unfriendTarget, setUnfriendTarget] = useState<FriendEntry | null>(null)
  const [unfriending, setUnfriending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

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
      setShowAddForm(false)
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
      setSelectedFriend(null)
      await loadFriends()
    } catch {
      setActionError('Failed to unfriend.')
    } finally {
      setUnfriending(false)
    }
  }

  const hasPending = summary.outgoing.length > 0
  const orderedFriends = [
    ...summary.friends.filter((friend) => friend.now_playing),
    ...summary.friends.filter((friend) => !friend.now_playing),
  ]
  const listItemCount = orderedFriends.length + summary.outgoing.length
  const isFriendsListScrollable = listItemCount > 4

  return (
    <div className="flex flex-col gap-6 pt-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <SettingsGearLink />
      </div>

      <NotificationCenter disabled={!user} onFriendsChanged={loadFriends} />

      <PoweringLiftSection disabled={!user} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-accent">
              <FriendsIcon />
            </span>
            <h2 className="text-sm font-medium text-text-secondary">Friends</h2>
          </div>
          <button
            type="button"
            className={`-my-2 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors hover:bg-surface-secondary disabled:opacity-50 ${
              showAddForm ? 'text-accent' : 'text-text-secondary hover:text-text'
            }`}
            aria-label={showAddForm ? 'Hide add friend form' : 'Add friend'}
            aria-expanded={showAddForm}
            disabled={!user}
            onClick={() => {
              setShowAddForm((open) => !open)
              setAddError(null)
            }}
          >
            <span>Add</span>
            <AddFriendIcon />
          </button>
        </div>

        <Card padding="sm" className="p-0 overflow-hidden">
          {showAddForm && (
            <div className="border-b border-border p-3.5">
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
            </div>
          )}

          {friendsLoading ? (
            <SkeletonGroup className="flex flex-col gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex min-h-16 items-center gap-3 rounded-xl px-3.5 py-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-md" />
                </div>
              ))}
            </SkeletonGroup>
          ) : summary.friends.length === 0 && !hasPending ? (
            <p className="px-3.5 py-4 text-sm text-text-secondary text-center">No friends yet.</p>
          ) : (
            <ul
              className={[
                'flex flex-col gap-1.5',
                isFriendsListScrollable
                  ? 'max-h-[calc(4*4rem+3*0.375rem+0.875rem)] overflow-y-auto overscroll-contain'
                  : '',
              ].join(' ')}
            >
              {orderedFriends.map((friend) => (
                <li key={friend.user_id} className="w-full min-h-16">
                  <button
                    type="button"
                    className="flex h-full min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl py-2 pl-3.5 pr-2 text-left transition-[filter] hover:brightness-[0.97] active:brightness-[0.94]"
                    style={{ backgroundColor: `${friend.accent_color}18` }}
                    aria-label={`View ${formatUsername(friend.display_name)} profile`}
                    onClick={() => setSelectedFriend(friend)}
                  >
                    <div className="pointer-events-none min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {formatUsername(friend.display_name)}
                      </p>
                      {friend.now_playing ? (
                        <FriendNowPlayingInline
                          nowPlaying={friend.now_playing}
                          accentColor={friend.accent_color}
                        />
                      ) : (
                        <FriendNoTrackInline accentColor={friend.accent_color} />
                      )}
                    </div>
                    <div className="pointer-events-none shrink-0">
                      {friend.now_playing ? (
                        <TrackArtwork url={friend.now_playing.album_art_url} size="lg" />
                      ) : (
                        <TrackArtworkPlaceholder accentColor={friend.accent_color} size="lg" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
              {summary.outgoing.map((request) => (
                <li
                  key={request.request_id}
                  className="flex min-h-16 items-center gap-3 rounded-xl px-3.5 py-2 transition-colors hover:bg-surface-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
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
          )}
        </Card>

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

      {selectedFriend && (
        <FriendProfileModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onUnfriend={() => {
            setUnfriendTarget(selectedFriend)
            setSelectedFriend(null)
          }}
        />
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
