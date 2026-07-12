import { type CSSProperties, type ReactNode, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/Button'

/**
 * Drop-in replacement for Modal that slides up from the bottom instead of
 * appearing as a centered overlay. Accepts the same props as Modal so callers
 * only need to change the import.
 *
 * Always portals to document.body so nested sheets (and fixed + transform
 * ancestors) do not steal iOS touch scrolling from the active sheet.
 */
export function BottomSheet({
  title,
  children,
  onClose,
  titleAdornment,
  headerAction,
  showCloseButton = false,
  scrollable = false,
  bodyClassName = 'mt-4',
  accentColor,
  zIndexClassName = 'z-[100]',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  titleAdornment?: ReactNode
  headerAction?: ReactNode
  showCloseButton?: boolean
  scrollable?: boolean
  bodyClassName?: string
  accentColor?: string
  /** Stacking class when nesting sheets (default z-[100]). */
  zIndexClassName?: string
}) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const sheet = (
    <div
      className={[
        'fixed inset-0 flex items-end',
        zIndexClassName,
        'transition-all duration-300',
        visible ? 'glass-scrim' : 'glass-scrim-hidden',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleClose}
    >
      <div
        className={[
          'w-full rounded-t-2xl border-x border-t liquid-glass-surface',
          scrollable ? 'flex max-h-[90dvh] flex-col' : 'max-h-[90dvh] overflow-auto',
          'transition-transform duration-300 ease-out',
          'touch-pan-y',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        style={accentColor ? ({ '--color-accent': accentColor } as CSSProperties) : undefined}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Drag handle + title — never scrolls away */}
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-text/15" />
          {headerAction ? (
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId} className="flex min-w-0 items-center gap-2.5 text-lg font-semibold">
                {titleAdornment}
                <span className="truncate">{title}</span>
              </h2>
              {headerAction}
            </div>
          ) : (
            <h2 id={titleId} className="flex items-center gap-2.5 text-lg font-semibold">
              {titleAdornment}
              <span className={titleAdornment ? 'truncate' : ''}>{title}</span>
            </h2>
          )}
        </div>

        {/* Body */}
        <div
          className={[
            'px-5',
            bodyClassName,
            scrollable ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain' : '',
          ].join(' ')}
        >
          {children}
        </div>

        {/* Close button + safe area bottom padding */}
        <div className="shrink-0 px-5 pb-5">
          {showCloseButton && (
            <Button
              variant="secondary"
              fullWidth
              className={scrollable ? 'mt-4' : 'mt-5'}
              onClick={handleClose}
            >
              Close
            </Button>
          )}
          <div className="safe-bottom" />
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(sheet, document.body)
}
