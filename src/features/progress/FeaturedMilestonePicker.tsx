import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Modal } from '@/components/Modal'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { MilestoneHighlight } from '@/components/milestone-icons/MilestoneHighlight'
import { MilestoneIcon } from '@/components/milestone-icons/MilestoneIcons'
import { fetchProfile, updateProfileSettings } from '@/features/settings/profileApi'
import {
  MILESTONE_CATEGORIES,
  getCategoryValue,
  getMilestoneCategory,
  getMilestoneProgress,
} from '@/lib/milestones'
import type { MilestoneStats } from '@/lib/stats'
import type { MilestoneCategoryId } from '@/lib/types'

export function FeaturedMilestonePicker({ stats }: { stats: MilestoneStats }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState<MilestoneCategoryId | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      setSelected(null)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchProfile(user.id)
      .then((profile) => setSelected(profile?.featured_milestone_category ?? null))
      .catch(() => setSelected(null))
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleChange = async (value: string) => {
    if (!user) return

    const next = value === '' ? null : (value as MilestoneCategoryId)
    const previous = selected
    setSelected(next)
    setSaving(true)

    try {
      await updateProfileSettings(user.id, { featured_milestone_category: next })
    } catch {
      setSelected(previous)
    } finally {
      setSaving(false)
    }
  }

  const previewCategory = selected ? getMilestoneCategory(selected) : null
  const previewProgress = previewCategory
    ? getMilestoneProgress(getCategoryValue(stats, previewCategory.id), previewCategory)
    : null

  return (
    <Card padding="sm">
      <p className="font-medium leading-tight">
        Profile milestone
      </p>
      <p className="mt-0.5 text-sm leading-tight text-text-secondary">
        Choose one to display for friends!
      </p>

      {loading ? (
        <div className="mt-3 flex justify-center py-2">
          <LoadingSpinner size="inline" />
        </div>
      ) : (
        <>
          {previewCategory && previewProgress ? (
            <MilestoneHighlight
              className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface-secondary/50 p-3"
              categoryId={previewCategory.id}
              categoryName={previewCategory.name}
              tierIndex={previewProgress.tierIndex}
              hasTier={previewProgress.currentTier !== null}
              size={36}
            />
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-sm text-text-secondary">
              None featured
            </p>
          )}
          <Button
            variant="secondary"
            fullWidth
            className="mt-3"
            disabled={saving}
            onClick={() => setPickerOpen(true)}
          >
            {selected ? 'Change milestone' : 'Choose milestone'}
          </Button>
          {pickerOpen && (
            <MilestoneCarouselModal
              stats={stats}
              selected={selected}
              onClose={() => setPickerOpen(false)}
              onSelect={(id) => {
                setPickerOpen(false)
                handleChange(id ?? '')
              }}
            />
          )}
        </>
      )}
    </Card>
  )
}


const CARD_W = 148
const GAP = 14
const STEP = CARD_W + GAP

/**
 * Popup carousel of milestone cards. Swipe (or tap a side card) to bring one
 * to the center; the centered card is the one that gets featured.
 */
function MilestoneCarouselModal({
  stats,
  selected,
  onClose,
  onSelect,
}: {
  stats: MilestoneStats
  selected: MilestoneCategoryId | null
  onClose: () => void
  onSelect: (id: MilestoneCategoryId | null) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const startIndex = Math.max(0, MILESTONE_CATEGORIES.findIndex((c) => c.id === selected))
  const [position, setPosition] = useState(startIndex)
  const activeIndex = Math.min(MILESTONE_CATEGORIES.length - 1, Math.max(0, Math.round(position)))
  const active = MILESTONE_CATEGORIES[activeIndex]

  // Open centered on the featured card.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = startIndex * STEP
  }, [startIndex])

  const scrollTo = (index: number) => {
    scrollRef.current?.scrollTo({ left: index * STEP, behavior: 'smooth' })
  }

  return (
    <Modal title="Profile milestone" onClose={onClose}>
      <p className="text-sm text-text-secondary">Swipe to pick one to show friends.</p>

      <div
        ref={scrollRef}
        onScroll={(e) => setPosition(e.currentTarget.scrollLeft / STEP)}
        className="-mx-5 mt-4 flex snap-x snap-mandatory overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ gap: GAP }}
      >
        {/* Spacers let the first and last cards scroll to the center. They size
            against the scroller itself; percentage padding would use the
            narrower modal body and leave the edge cards off-center. */}
        <div aria-hidden className="shrink-0" style={{ width: `calc(50% - ${CARD_W / 2 + GAP}px)` }} />
        {MILESTONE_CATEGORIES.map((category, i) => {
          const { tierIndex, currentTier, nextTier } = getMilestoneProgress(
            getCategoryValue(stats, category.id),
            category,
          )
          // Cards shrink and fade the further they are from the center.
          const distance = Math.min(1, Math.abs(i - position))
          const isActive = i === activeIndex
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => (isActive ? onSelect(category.id) : scrollTo(i))}
              aria-label={isActive ? `Feature ${category.name}` : `Show ${category.name}`}
              className={[
                'flex h-52 shrink-0 snap-center flex-col items-center justify-center gap-3 rounded-2xl border bg-surface p-3 text-center shadow-md',
                category.id === selected ? 'border-accent ring-1 ring-accent/40' : 'border-border',
              ].join(' ')}
              style={{
                width: CARD_W,
                transform: `scale(${1 - distance * 0.12})`,
                opacity: (currentTier ? 1 : 0.75) - distance * 0.4,
              }}
            >
              <MilestoneIcon category={category.id} tier={tierIndex} size={64} />
              <span className="font-semibold leading-tight">{category.name}</span>
              <span className="text-xs text-text-secondary">
                {currentTier ? `Tier ${tierIndex + 1}` : 'Locked'}
                {nextTier ? ` · Next: ${nextTier.label}` : ''}
              </span>
            </button>
          )
        })}
        <div aria-hidden className="shrink-0" style={{ width: `calc(50% - ${CARD_W / 2 + GAP}px)` }} />
      </div>

      <div className="mt-1 flex justify-center gap-1.5" aria-hidden>
        {MILESTONE_CATEGORIES.map((category, i) => (
          <span
            key={category.id}
            className={[
              'h-1.5 rounded-full transition-all duration-200',
              i === activeIndex ? 'w-4 bg-accent' : 'w-1.5 bg-border',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button fullWidth onClick={() => onSelect(active.id)} disabled={active.id === selected}>
          {active.id === selected ? `${active.name} is featured` : `Feature ${active.name}`}
        </Button>
        <div className="flex gap-2">
          {selected && (
            <Button variant="secondary" fullWidth onClick={() => onSelect(null)}>
              Show none
            </Button>
          )}
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
