import { ReactNode, useId, type CSSProperties } from 'react'
import { Button } from '@/components/Button'

export function Modal({
  title,
  children,
  onClose,
  headerAction,
  showCloseButton = false,
  scrollable = false,
  bodyClassName = 'mt-4',
  accentColor,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  headerAction?: ReactNode
  showCloseButton?: boolean
  scrollable?: boolean
  bodyClassName?: string
  accentColor?: string
}) {
  const titleId = useId()

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={[
          'w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg',
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
}
