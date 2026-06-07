import { InfoPopover } from '@/components/InfoPopover'

export function SaveEntriesNotice() {
  return (
    <InfoPopover ariaLabel="About saving entries">
      <p className="text-sm text-text-secondary leading-relaxed">
        Tap <strong className="font-medium text-text">Save</strong> on each exercise after logging sets
        or cardio. Unsaved entries may be lost if you leave the page or refresh before saving.
      </p>
    </InfoPopover>
  )
}
