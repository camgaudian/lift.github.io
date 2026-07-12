import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { InfoPopover } from '@/components/InfoPopover'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SearchInput } from '@/components/SearchInput'
import { MusicPlayingIcon } from '@/components/MusicPlayingIcon'
import { TrackArtwork } from '@/components/TrackArtwork'
import {
  clearNowPlaying,
  fetchMyNowPlaying,
  fetchMyNowPlayingReactions,
  formatHoursLeft,
  searchSpotifyTracks,
  setNowPlaying,
} from '@/features/profile/nowPlayingApi'
import { ReactionStack, ReactionsListModal } from '@/features/profile/NowPlayingReactions'
import { Skeleton, SkeletonGroup } from '@/components/Skeleton'
import { useClickOutside } from '@/hooks/useClickOutside'
import { trackTextFadeClass, useColorPopText } from '@/lib/ui'
import type { NowPlaying, NowPlayingReaction, SpotifySearchTrack } from '@/lib/types'

function MusicIcon() {
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
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function SpotifyLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

function CurrentTrackPreview({
  track,
  reactions,
  removing,
  editMenuOpen,
  onToggleEditMenu,
  onRemove,
  onChange,
  onOpenReactions,
}: {
  track: NowPlaying
  reactions: NowPlayingReaction[]
  removing: boolean
  editMenuOpen: boolean
  onToggleEditMenu: () => void
  onRemove: () => void
  onChange: () => void
  onOpenReactions: () => void
}) {
  const editRef = useRef<HTMLDivElement>(null)

  useClickOutside(editRef, () => editMenuOpen && onToggleEditMenu(), editMenuOpen)

  // Tapping the track anywhere (including the reaction emojis) opens the list of
  // who reacted. The Edit control stops propagation so it keeps its own menu.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenReactions}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenReactions()
        }
      }}
      className="flex cursor-pointer items-center gap-3 rounded-xl transition-[filter] hover:brightness-[0.98] active:brightness-[0.96]"
    >
      <TrackArtwork url={track.album_art_url} size="xl" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <MusicPlayingIcon className="shrink-0" size="md" />
          <p className={`min-w-0 flex-1 text-sm font-medium ${trackTextFadeClass}`}>
            {track.title}
          </p>
        </div>
        <p className={`min-w-0 text-xs text-text-secondary ${trackTextFadeClass}`}>
          {track.artist}
        </p>
        <p className="text-xs text-text-secondary">{formatHoursLeft(track.expires_at)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div
          ref={editRef}
          className="relative flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="secondary" size="sm" onClick={onToggleEditMenu}>
            Edit
          </Button>
          {editMenuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1.5 w-36 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
              <button
                type="button"
                onClick={onChange}
                className="w-full px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-surface-secondary"
              >
                Change
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={onRemove}
                className="w-full border-t border-border px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-surface-secondary disabled:opacity-50"
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          )}
        </div>
        {reactions.length > 0 && <ReactionStack reactions={reactions} />}
      </div>
    </div>
  )
}

function SearchResultRow({
  track,
  setting,
  onSelect,
}: {
  track: SpotifySearchTrack
  setting: boolean
  onSelect: (track: SpotifySearchTrack) => void
}) {
  return (
    <button
      type="button"
      disabled={setting}
      onClick={() => onSelect(track)}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-secondary disabled:opacity-50"
    >
      <TrackArtwork url={track.album_art_url} size="md" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{track.title}</p>
        <p className="truncate text-xs text-text-secondary">
          {track.artist} · {track.album}
        </p>
      </div>
    </button>
  )
}

export function PoweringLiftSection({ disabled }: { disabled?: boolean }) {
  const sectionTitleClass = useColorPopText('text-text-secondary')
  const searchRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState<NowPlaying | null>(null)
  const [reactions, setReactions] = useState<NowPlayingReaction[]>([])
  const [showReactions, setShowReactions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifySearchTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [setting, setSetting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [editMenuOpen, setEditMenuOpen] = useState(false)
  const [showChangeSearch, setShowChangeSearch] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const dismissResults = useCallback(() => setResults([]), [])

  useClickOutside(searchRef, dismissResults, results.length > 0)

  const loadCurrent = useCallback(async () => {
    if (disabled) {
      setCurrent(null)
      setReactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchMyNowPlaying()
      setCurrent(data)
      if (data) {
        const reactionData = await fetchMyNowPlayingReactions()
        setReactions(reactionData)
      } else {
        setReactions([])
      }
    } catch {
      setActionError('Failed to load your song.')
    } finally {
      setLoading(false)
    }
  }, [disabled])

  useEffect(() => {
    loadCurrent()
  }, [loadCurrent])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSearchError(null)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const tracks = await searchSpotifyTracks(trimmed)
        setResults(tracks)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Search failed. Check that Spotify is configured.'
        setSearchError(message)
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = async (track: SpotifySearchTrack) => {
    setSetting(true)
    setActionError(null)
    try {
      const saved = await setNowPlaying(track)
      setCurrent(saved)
      setReactions([])
      setQuery('')
      setResults([])
      setShowChangeSearch(false)
      setEditMenuOpen(false)
    } catch {
      setActionError('Failed to set song.')
    } finally {
      setSetting(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    setActionError(null)
    try {
      await clearNowPlaying()
      setCurrent(null)
      setReactions([])
      setShowReactions(false)
      setShowChangeSearch(false)
      setEditMenuOpen(false)
    } catch {
      setActionError('Failed to remove song.')
    } finally {
      setRemoving(false)
    }
  }

  const showSearch = !current || showChangeSearch

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-accent">
          <MusicIcon />
        </span>
        <h2 className={`text-sm font-medium ${sectionTitleClass}`}>What&apos;s powering your Lift?</h2>
        <InfoPopover ariaLabel="How sharing works" size="sm">
          <p className="text-sm text-text-secondary leading-relaxed">
            Search for a song to share with your friends. It appears next to your username on their
            friends list for 24 hours. You can change or clear it anytime.
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-text-secondary">
            <SpotifyLogo />
            <span>Powered by Spotify</span>
          </p>
        </InfoPopover>
      </div>

      <Card padding="sm" className="flex flex-col gap-3">
        {loading ? (
          <SkeletonGroup className="flex items-center gap-3">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-9 w-14 rounded-xl" />
          </SkeletonGroup>
        ) : (
          <>
            {current && (
              <CurrentTrackPreview
                track={current}
                reactions={reactions}
                removing={removing}
                editMenuOpen={editMenuOpen}
                onToggleEditMenu={() => setEditMenuOpen((open) => !open)}
                onRemove={handleRemove}
                onChange={() => {
                  setShowChangeSearch(true)
                  setEditMenuOpen(false)
                }}
                onOpenReactions={() => setShowReactions(true)}
              />
            )}

            {showSearch && (
              <div ref={searchRef}>
                <SearchInput
                  label={current ? 'Change song' : 'Search for a song'}
                  placeholder="Song or artist"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={disabled || setting}
                />

                {searching && (
                  <div className="flex justify-center py-2">
                    <LoadingSpinner size="inline" />
                  </div>
                )}

                {results.length > 0 && (
                  <div className="mt-3 -mx-3.5 overflow-hidden rounded-xl border border-border">
                    <ul className="divide-y divide-border">
                      {results.map((track) => (
                        <li key={track.track_id}>
                          <SearchResultRow
                            track={track}
                            setting={setting}
                            onSelect={handleSelect}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {searchError && <p className="text-sm text-danger text-center">{searchError}</p>}
            {actionError && <p className="text-sm text-danger text-center">{actionError}</p>}
          </>
        )}
      </Card>

      {showReactions && (
        <ReactionsListModal reactions={reactions} onClose={() => setShowReactions(false)} />
      )}
    </section>
  )
}
