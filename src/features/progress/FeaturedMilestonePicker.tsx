import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { MilestoneHighlight } from '@/components/milestone-icons/MilestoneHighlight'
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
      <label htmlFor="featured-milestone" className="font-medium leading-tight">
        Profile milestone
      </label>
      <p className="mt-0.5 text-sm leading-tight text-text-secondary">
        Choose one to display for friends!
      </p>

      {loading ? (
        <div className="mt-3 flex justify-center py-2">
          <LoadingSpinner size="inline" />
        </div>
      ) : (
        <>
          <select
            id="featured-milestone"
            value={selected ?? ''}
            disabled={saving}
            onChange={(e) => handleChange(e.target.value)}
            className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent disabled:opacity-60"
          >
            <option value="">None</option>
            {MILESTONE_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {previewCategory && previewProgress && (
            <MilestoneHighlight
              className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface-secondary/50 p-3"
              categoryId={previewCategory.id}
              categoryName={previewCategory.name}
              tierIndex={previewProgress.tierIndex}
              hasTier={previewProgress.currentTier !== null}
              size={36}
            />
          )}
        </>
      )}
    </Card>
  )
}
