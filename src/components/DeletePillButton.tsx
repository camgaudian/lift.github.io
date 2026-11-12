import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'

/**
 * Two-tap delete. The first tap grows the icon into a red pill with `label`;
 * a second tap confirms. Left alone (3s) or tapped away from, it shrinks back.
 *
 * - `inline`: sits in a row; `idleWidth`/`armedWidth` size it.
 * - `corner`: the quarter-circle button in an exercise card's bottom-right
 *   corner; becomes a pill tucked into that corner.
 */
export function DeletePillButton({
  icon,
  label = 'Delete',
  ariaLabel,
  onConfirm,
  variant = 'inline',
  idleWidth = '1.875rem',
  armedWidth = '4.25rem',
  disabled = false,
}: {
  icon: ReactNode
  label?: string
  ariaLabel: string
  onConfirm: () => void
  variant?: 'inline' | 'corner'
  idleWidth?: string
  armedWidth?: string
  disabled?: boolean
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(timer)
  }, [armed])

  const corner = variant === 'corner'

  return (
    <button
      type="button"
      disabled={disabled}
      data-armed={armed || undefined}
      onClick={() => {
        if (!armed) {
          setArmed(true)
          return
        }
        setArmed(false)
        onConfirm()
      }}
      onBlur={() => setArmed(false)}
      aria-label={armed ? `Tap again to confirm: ${ariaLabel}` : ariaLabel}
      className={[
        corner ? 'delete-pill-corner' : 'delete-pill relative shrink-0 py-1.5',
        'overflow-hidden text-text-secondary hover:text-danger disabled:opacity-50',
      ].join(' ')}
      style={
        corner
          ? undefined
          : ({ '--pill-idle': idleWidth, '--pill-armed': armedWidth } as CSSProperties)
      }
    >
      <span
        aria-hidden
        className={[
          'delete-pill-x absolute flex items-center justify-center',
          corner ? 'bottom-3 right-3' : 'inset-0',
        ].join(' ')}
      >
        {icon}
      </span>
      <span
        aria-hidden
        className="delete-pill-label absolute inset-0 flex items-center justify-center whitespace-nowrap text-xs font-semibold text-danger"
      >
        {label}
      </span>
      {/* Gives the inline button its height; the visible content is absolute. */}
      {!corner && (
        <span aria-hidden className="invisible flex items-center justify-center">
          {icon}
        </span>
      )}
    </button>
  )
}
