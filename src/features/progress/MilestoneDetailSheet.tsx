import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { MilestoneIcon } from '@/components/milestone-icons/MilestoneIcons'
import {
  formatMilestoneValue,
  getCategoryValue,
  getMilestoneProgress,
  type MilestoneCategory,
} from '@/lib/milestones'
import type { MilestoneStats } from '@/lib/stats'

interface Props {
  category: MilestoneCategory
  stats: MilestoneStats
  onClose: () => void
}

export function MilestoneDetailSheet({ category, stats, onClose }: Props) {
  const { unit } = useProfile()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const value = getCategoryValue(stats, category.id)
  const { tierIndex, currentTier, nextTier } = getMilestoneProgress(value, category)
  const isMaxTier = currentTier !== null && nextTier === null

  const earnedTiers = tierIndex >= 0 ? category.tiers.slice(0, tierIndex + 1) : []

  const prevThreshold = tierIndex >= 0 ? category.tiers[tierIndex].threshold : 0
  const progressPct =
    nextTier && nextTier.threshold > prevThreshold
      ? Math.min(
          100,
          Math.round(((value - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100),
        )
      : 100

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div
      className={[
        'fixed inset-0 z-[100] flex items-end',
        'transition-all duration-300',
        visible ? 'glass-scrim' : 'glass-scrim-hidden',
      ].join(' ')}
      onClick={handleClose}
    >
      <div
        className={[
          'w-full rounded-t-2xl border-x border-t liquid-glass-surface',
          'max-h-[90dvh] overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pb-5 pt-3">
          {/* Drag handle */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-text/15" />

          {/* Header */}
          <div className="mb-5">
            <h2 className="text-lg font-semibold leading-tight">{category.name}</h2>
            <p className="mt-0.5 text-sm leading-tight text-text-secondary">
              {formatMilestoneValue(category.id, value, unit)} total
            </p>
          </div>

          {/* Earned tiers */}
          <div className="flex flex-col gap-1.5">
            {earnedTiers.length === 0 ? (
              <p className="py-1 text-sm text-text-secondary">No tiers earned yet.</p>
            ) : (
              earnedTiers.map((tier, i) => {
                const isCurrent = i === tierIndex
                return (
                  <div
                    key={i}
                    className={[
                      'flex items-center gap-3 rounded-xl px-3 py-2.5',
                      isCurrent ? 'bg-surface-secondary' : '',
                    ].join(' ')}
                  >
                    <div className="shrink-0 leading-none">
                      <MilestoneIcon category={category.id} tier={i} size={40} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">Tier {i + 1}</p>
                      <p className="mt-0.5 text-sm leading-tight text-text-secondary">
                        {tier.label}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="shrink-0 text-xs font-semibold text-accent">Current</span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Progress bar + next tier */}
          {nextTier && (
            <>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
                  <span>Progress to Tier {tierIndex + 2}</span>
                  <span>
                    {formatMilestoneValue(category.id, value, unit)} / {nextTier.label}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 opacity-40">
                <div className="shrink-0 leading-none">
                  <MilestoneIcon category={category.id} tier={tierIndex + 1} size={40} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">Tier {tierIndex + 2}</p>
                  <p className="mt-0.5 text-sm leading-tight text-text-secondary">
                    {nextTier.label}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-text-secondary">Next</span>
              </div>
            </>
          )}

          {/* Max tier message */}
          {isMaxTier && (
            <p className="mt-4 text-center text-sm font-semibold text-success">Max tier reached!</p>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="mt-5 w-full rounded-xl bg-surface-secondary py-3 text-sm font-medium text-text transition-opacity active:opacity-60"
          >
            Close
          </button>

          {/* Safe area spacer */}
          <div className="safe-bottom" />
        </div>
      </div>
    </div>
  )
}
