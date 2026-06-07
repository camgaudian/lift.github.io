import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { MilestoneIcon } from '@/components/milestone-icons/MilestoneIcons'
import { FeaturedMilestonePicker } from '@/features/progress/FeaturedMilestonePicker'
import {
  MILESTONE_CATEGORIES,
  formatMilestoneValue,
  getCategoryValue,
  getMilestoneProgress,
} from '@/lib/milestones'
import { fetchMilestoneStats, type MilestoneStats } from '@/lib/stats'

export function MilestonesSection() {
  const { unit } = useProfile()
  const [stats, setStats] = useState<MilestoneStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMilestoneStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner size="section" />

  if (!stats) {
    return <p className="text-sm text-text-secondary">Could not load milestones.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <FeaturedMilestonePicker stats={stats} />

      {MILESTONE_CATEGORIES.map((category) => {
        const value = getCategoryValue(stats, category.id)
        const { tierIndex, currentTier, nextTier } = getMilestoneProgress(value, category)

        return (
          <Card key={category.id} padding="sm" className="flex items-center gap-3">
            <div className="shrink-0 leading-none">
              <MilestoneIcon category={category.id} tier={tierIndex} size={40} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{category.name}</p>
                  <p className="mt-0.5 text-sm leading-tight text-text-secondary">
                    {formatMilestoneValue(category.id, value, unit)} total
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium leading-tight">
                    {currentTier ? `Tier ${tierIndex + 1}` : 'Locked'}
                  </p>
                  {nextTier ? (
                    <p className="mt-0.5 text-sm leading-tight text-text-secondary">
                      Next: {nextTier.label}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm leading-tight text-success">Max tier</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
