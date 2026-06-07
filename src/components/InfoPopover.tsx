import { ReactNode, useRef, useState } from 'react'
import { InfoIcon } from '@/components/InfoIcon'
import { useTheme } from '@/contexts/ThemeContext'
import { useClickOutside } from '@/hooks/useClickOutside'

export function InfoPopover({
  ariaLabel,
  children,
}: {
  ariaLabel: string
  children: ReactNode
}) {
  const { accentColor } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useClickOutside(rootRef, () => setOpen(false), open)

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-80"
        style={{ backgroundColor: `${accentColor}18` }}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <InfoIcon size={16} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-3 shadow-lg">
          {children}
        </div>
      )}
    </div>
  )
}
