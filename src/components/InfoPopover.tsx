import { ReactNode, useState } from 'react'
import { InfoIcon } from '@/components/InfoIcon'
import { Modal } from '@/components/Modal'
import { useTheme } from '@/contexts/ThemeContext'

const triggerSizes = {
  sm: { button: 'h-7 w-7', icon: 14 },
  md: { button: 'h-8 w-8', icon: 16 },
} as const

export function InfoPopover({
  ariaLabel,
  title,
  size = 'md',
  children,
}: {
  ariaLabel: string
  title?: string
  size?: keyof typeof triggerSizes
  children: ReactNode
}) {
  const { accentColor } = useTheme()
  const [open, setOpen] = useState(false)
  const modalTitle = title ?? ariaLabel
  const trigger = triggerSizes[size]

  return (
    <>
      <button
        type="button"
        className={`inline-flex ${trigger.button} shrink-0 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-80`}
        style={{ backgroundColor: `${accentColor}18` }}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <InfoIcon size={trigger.icon} />
      </button>
      {open && (
        <Modal title={modalTitle} onClose={() => setOpen(false)} showCloseButton>
          {children}
        </Modal>
      )}
    </>
  )
}
