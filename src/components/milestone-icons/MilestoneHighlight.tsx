import { MilestoneIcon } from '@/components/milestone-icons/MilestoneIcons'
import type { MilestoneCategoryId } from '@/lib/types'

export function MilestoneHighlight({
  categoryId,
  categoryName,
  tierIndex,
  hasTier,
  size = 40,
  accentColor,
  className = 'flex items-center gap-3 rounded-xl border border-border bg-surface-secondary/50 p-3',
}: {
  categoryId: MilestoneCategoryId
  categoryName: string
  tierIndex: number
  hasTier: boolean
  size?: number
  accentColor?: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="shrink-0 leading-none">
        <MilestoneIcon
          category={categoryId}
          tier={tierIndex}
          size={size}
          accentColor={accentColor}
        />
      </div>
      <div className="min-w-0">
        <p className="font-medium leading-tight">{categoryName}</p>
        <p className="mt-0.5 text-sm leading-tight text-text-secondary">
          {hasTier ? `Tier ${tierIndex + 1}` : 'Locked'}
        </p>
      </div>
    </div>
  )
}
