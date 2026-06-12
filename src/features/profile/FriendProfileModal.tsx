import { useEffect, useState } from 'react'
import { MusicPlayingIcon } from '@/components/MusicPlayingIcon'
import { Modal } from '@/components/Modal'
import { ShareIcon } from '@/components/ShareIcon'
import { TrashIcon } from '@/components/TrashIcon'
import { ShareContentModal } from '@/features/sharing/ShareContentModal'
import { TrackArtwork } from '@/components/TrackArtwork'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { MilestoneHighlight } from '@/components/milestone-icons/MilestoneHighlight'
import { formatHoursLeft } from '@/features/profile/nowPlayingApi'
import { formatUsername } from '@/lib/format'
import {
  getCategoryValue,
  getMilestoneCategory,
  getMilestoneProgress,
} from '@/lib/milestones'
import { reactToNowPlaying } from '@/features/profile/nowPlayingApi'
import { ReactionPicker } from '@/features/profile/NowPlayingReactions'
import { fetchFriendMilestoneStats, type MilestoneStats } from '@/lib/stats'
import { iconDeleteButtonClass, useColorPopText, useSectionHeadingClass } from '@/lib/ui'
import type { FriendEntry, NowPlaying } from '@/lib/types'

function FriendNowPlayingPreview({
  nowPlaying,
  accentColor,
  myReaction,
  reacting,
  onReact,
  artistClass,
}: {
  nowPlaying: NowPlaying
  accentColor: string
  myReaction: string | null
  reacting: boolean
  onReact: (emoji: string) => void
  artistClass: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-accent/30 bg-surface-secondary/50 p-4">
      <TrackArtwork url={nowPlaying.album_art_url} size="xl" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-base font-medium">
          <MusicPlayingIcon size="md" accentColor={accentColor} />
          <span className="truncate">{nowPlaying.title}</span>
        </p>
        <p className={`truncate text-sm ${artistClass}`}>{nowPlaying.artist}</p>
        <p className="mt-1 text-xs text-text-secondary">{formatHoursLeft(nowPlaying.expires_at)}</p>
      </div>
      <ReactionPicker current={myReaction} disabled={reacting} onSelect={onReact} />
    </div>
  )
}

export function FriendProfileModal({
  friend,
  onClose,
  onUnfriend,
}: {
  friend: FriendEntry
  onClose: () => void
  onUnfriend: () => void
}) {
  const [milestoneStats, setMilestoneStats] = useState<MilestoneStats | null>(null)
  const [milestoneLoading, setMilestoneLoading] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [myReaction, setMyReaction] = useState<string | null>(
    friend.now_playing?.my_reaction ?? null,
  )
  const [reacting, setReacting] = useState(false)
  const [reactionError, setReactionError] = useState<string | null>(null)
  const sectionHeadingClassName = useSectionHeadingClass()
  const artistClass = useColorPopText('text-text-secondary')

  useEffect(() => {
    if (!friend.featured_milestone_category) {
      setMilestoneStats(null)
      return
    }

    setMilestoneLoading(true)
    fetchFriendMilestoneStats(friend.user_id)
      .then(setMilestoneStats)
      .catch(() => setMilestoneStats(null))
      .finally(() => setMilestoneLoading(false))
  }, [friend.user_id, friend.featured_milestone_category])

  const handleReact = async (emoji: string) => {
    if (reacting) return
    setReacting(true)
    setReactionError(null)
    const previous = myReaction
    // Optimistic toggle: same emoji clears it, a different one replaces it.
    setMyReaction(previous === emoji ? null : emoji)
    try {
      const result = await reactToNowPlaying(friend.user_id, emoji)
      if (!result.ok) {
        setMyReaction(previous)
        setReactionError('Could not save your reaction.')
        return
      }
      setMyReaction(result.reaction)
    } catch {
      setMyReaction(previous)
      setReactionError('Could not save your reaction.')
    } finally {
      setReacting(false)
    }
  }

  const featuredMilestone = friend.featured_milestone_category
    ? getMilestoneCategory(friend.featured_milestone_category)
    : null
  const featuredProgress =
    featuredMilestone && milestoneStats
      ? getMilestoneProgress(
          getCategoryValue(milestoneStats, featuredMilestone.id),
          featuredMilestone,
        )
      : null

  return (
    <>
    <Modal
      title={formatUsername(friend.display_name)}
      onClose={onClose}
      showCloseButton
      accentColor={friend.accent_color}
      bodyClassName="mt-4 flex flex-col gap-4"
      headerAction={
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            aria-label="Share with friend"
            onClick={() => setShowShare(true)}
          >
            <ShareIcon size={16} />
            <span>Share</span>
          </button>
          <button
            type="button"
            className={iconDeleteButtonClass}
            aria-label="Unfriend"
            onClick={onUnfriend}
          >
            <TrashIcon />
          </button>
        </div>
      }
    >
      <section className="flex flex-col gap-1.5">
        <h3 className={sectionHeadingClassName}>Today&apos;s lift track</h3>
        {friend.now_playing ? (
          <FriendNowPlayingPreview
            nowPlaying={friend.now_playing}
            accentColor={friend.accent_color}
            myReaction={myReaction}
            reacting={reacting}
            onReact={handleReact}
            artistClass={artistClass}
          />
        ) : (
          <p className="px-1 text-sm text-text-secondary">No song chosen.</p>
        )}
        {reactionError && (
          <p className="px-1 text-sm text-danger">{reactionError}</p>
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className={sectionHeadingClassName}>Profile milestone</h3>
        {!friend.featured_milestone_category ? (
          <p className="px-1 text-sm text-text-secondary">No milestone chosen.</p>
        ) : milestoneLoading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="inline" />
          </div>
        ) : featuredMilestone && featuredProgress ? (
          <MilestoneHighlight
            className="flex items-center gap-3 rounded-xl border border-accent/30 bg-surface-secondary/50 p-4"
            categoryId={featuredMilestone.id}
            categoryName={featuredMilestone.name}
            tierIndex={featuredProgress.tierIndex}
            hasTier={featuredProgress.currentTier !== null}
            detailLabel={featuredProgress.currentTier?.label}
            accentColor={friend.accent_color}
          />
        ) : (
          <p className="px-1 text-sm text-text-secondary">Could not load milestone.</p>
        )}
      </section>
    </Modal>
    {showShare && <ShareContentModal friend={friend} onClose={() => setShowShare(false)} />}
    </>
  )
}
