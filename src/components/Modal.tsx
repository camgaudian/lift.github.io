import { ReactNode, useEffect, useId, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/Button'

/**
 * Centered overlay dialog. Always portals to document.body so nesting under
 * BottomSheet (or other fixed/transformed ancestors) does not trap the modal
 * under a higher stacking context.
 */
export function Modal({
  title,
  children,
  onClose,
  headerAction,
  showCloseButton = false,
  scrollable = false,
  bodyClassName = 'mt-4',
  accentColor,
  footer,
  zIndexClassName = 'z-[100]',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  headerAction?: ReactNode
  showCloseButton?: boolean
  scrollable?: boolean
  bodyClassName?: string
  accentColor?: string
  footer?: ReactNode
  /** Stacking class when nesting over sheets (default z-[100]). */
  zIndexClassName?: string
}) {
  const titleId = useId()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const modal = (
    <div
      className={[
        'fixed inset-0 flex items-center justify-center glass-scrim p-4',
        zIndexClassName,
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={[
          'w-full max-w-md rounded-2xl border liquid-glass-surface p-5',
          scrollable ? 'flex max-h-[min(90dvh,calc(100dvh-2rem))] flex-col' : '',
        ].join(' ')}
        style={accentColor ? ({ '--color-accent': accentColor } as CSSProperties) : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {headerAction ? (
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold">
              {title}
            </h2>
            {headerAction}
          </div>
        ) : (
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
        )}
        <div
          className={[
            bodyClassName,
            scrollable ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain' : '',
          ].join(' ')}
        >
          {children}
        </div>
        {footer}
        {showCloseButton && (
          <Button
            variant="secondary"
            fullWidth
            className={scrollable ? 'mt-4 shrink-0' : 'mt-5'}
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
