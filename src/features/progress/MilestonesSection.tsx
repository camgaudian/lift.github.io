import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { Card } from '@/components/Card'
import { Skeleton, SkeletonGroup } from '@/components/Skeleton'
import { MilestoneIcon } from '@/components/milestone-icons/MilestoneIcons'
import { FeaturedMilestonePicker } from '@/features/progress/FeaturedMilestonePicker'
import { MilestoneDetailSheet } from '@/features/progress/MilestoneDetailSheet'
import {
  MILESTONE_CATEGORIES,
  formatMilestoneValue,
  getCategoryValue,
  getMilestoneProgress,
  type MilestoneCategory,
} from '@/lib/milestones'
import { fetchMilestoneStats, type MilestoneStats } from '@/lib/stats'

function MilestonesSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-3">
      <Card padding="sm">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-0.5 h-3 w-48" />
        <Skeleton className="mt-3 h-10 w-full rounded-xl" />
      </Card>
      {Array.from({ length: MILESTONE_CATEGORIES.length }).map((_, i) => (
        <Card key={i} padding="sm" className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-0.5 h-3 w-20" />
              </div>
              <div className="shrink-0 text-right">
                <Skeleton className="ml-auto h-4 w-16" />
                <Skeleton className="mt-0.5 ml-auto h-3 w-20" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </SkeletonGroup>
  )
}

export function MilestonesSection() {
  const { unit } = useProfile()
  const [stats, setStats] = useState<MilestoneStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<MilestoneCategory | null>(null)

  useEffect(() => {
    fetchMilestoneStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <MilestonesSkeleton />

  if (!stats) {
    return <p className="text-sm text-text-secondary">Could not load milestones.</p>
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <FeaturedMilestonePicker stats={stats} />

        {MILESTONE_CATEGORIES.map((category) => {
          const value = getCategoryValue(stats, category.id)
          const { tierIndex, currentTier, nextTier } = getMilestoneProgress(value, category)

          return (
            <button
              key={category.id}
              type="button"
              className="w-full cursor-pointer text-left transition-opacity active:opacity-70"
              onClick={() => setSelectedCategory(category)}
            >
              <Card padding="sm" className="flex items-center gap-3">
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
            </button>
          )
        })}
      </div>

      {selectedCategory && (
        <MilestoneDetailSheet
          category={selectedCategory}
          stats={stats}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </>
  )
}
