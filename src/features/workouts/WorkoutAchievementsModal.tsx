import { BottomSheet } from '@/components/BottomSheet'
import { Card } from '@/components/Card'
import { MilestoneHighlight } from '@/components/milestone-icons/MilestoneHighlight'
import { useProfile } from '@/contexts/ProfileContext'
import { formatWeight } from '@/lib/units'
import type { WorkoutAchievements } from '@/lib/workoutAchievements'

export function WorkoutAchievementsModal({
  achievements,
  onClose,
}: {
  achievements: WorkoutAchievements
  onClose: () => void
}) {
  const { unit } = useProfile()
  const { milestones, prs } = achievements

  return (
    <BottomSheet title="New achievements!" onClose={onClose} showCloseButton scrollable>
      <div className="flex flex-col gap-4">
        {milestones.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-text-secondary">
              Milestones unlocked
            </h3>
            <div className="flex flex-col gap-2">
              {milestones.map((milestone) => (
                <MilestoneHighlight
                  key={`${milestone.categoryId}-${milestone.tierIndex}`}
                  categoryId={milestone.categoryId}
                  categoryName={milestone.categoryName}
                  tierIndex={milestone.tierIndex}
                  hasTier
                  detailLabel={milestone.tierLabel}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary/50 p-3"
                />
              ))}
            </div>
          </section>
        )}

        {prs.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-text-secondary">New PRs</h3>
            <div className="flex flex-col gap-2">
              {prs.map((pr) => (
                <Card key={pr.exerciseId} padding="sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate font-medium">{pr.exerciseName}</p>
                    <p className="shrink-0 font-semibold">
                      {formatWeight(pr.weightLb, unit)} × {pr.reps}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </BottomSheet>
  )
}
