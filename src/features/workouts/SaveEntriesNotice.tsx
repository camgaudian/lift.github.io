import { InfoPopover } from '@/components/InfoPopover'

export function SaveEntriesNotice() {
  return (
    <InfoPopover ariaLabel="About saving entries">
      <p className="text-sm text-text-secondary leading-relaxed">
        Your sets and notes <strong className="font-medium text-text">save automatically</strong> as
        you log them, so you can leave and come back without losing anything.
      </p>
    </InfoPopover>
  )
}
