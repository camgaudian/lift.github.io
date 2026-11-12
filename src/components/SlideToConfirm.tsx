import { type ReactNode, useEffect, useRef, useState } from 'react'

const THUMB = 48
const PAD = 4
const CONFIRM_RATIO = 0.85

function ChevronsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 17l5-5-5-5M13 17l5-5-5-5" />
    </svg>
  )
}

/**
 * Drag the thumb to the end of the track to confirm. Harder to trigger by
 * accident than a button, so it replaces a separate "Are you sure?" dialog.
 * `onConfirm` returns false when it could not start (e.g. validation failed),
 * which snaps the thumb back. While `busy`, `busyContent` fills the track.
 */
export function SlideToConfirm({
  label,
  onConfirm,
  busy = false,
  busyContent,
  disabled = false,
}: {
  label: string
  onConfirm: () => boolean | void
  busy?: boolean
  busyContent?: ReactNode
  disabled?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; max: number } | null>(null)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [nudge, setNudge] = useState(0)
  const wasBusy = useRef(busy)

  // Reset once the confirmed action finishes (success or error).
  useEffect(() => {
    if (wasBusy.current && !busy) setX(0)
    wasBusy.current = busy
  }, [busy])

  const maxX = () => Math.max(0, (trackRef.current?.clientWidth ?? 0) - THUMB - PAD * 2)
  const locked = disabled || busy

  const confirm = () => {
    setX(maxX())
    const started = onConfirm()
    if (started === false) {
      setX(0)
      setNudge((n) => n + 1)
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (locked) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX - x, max: maxX() }
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    setX(Math.min(drag.max, Math.max(0, e.clientX - drag.startX)))
  }

  const onPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (drag.max > 0 && x >= drag.max * CONFIRM_RATIO) confirm()
    else setX(0)
  }

  const max = maxX() || 1
  const progress = busy ? 1 : Math.min(1, x / max)

  return (
    <div
      ref={trackRef}
      key={nudge}
      className={[
        'relative h-14 w-full select-none overflow-hidden rounded-full bg-accent/12',
        nudge > 0 ? 'slide-confirm-nudge' : '',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-full bg-accent"
        style={{
          width: busy ? '100%' : `${x + THUMB + PAD * 2}px`,
          opacity: 0.25 + progress * 0.75,
          transition: dragging ? 'none' : 'width 320ms cubic-bezier(0.34, 1.3, 0.64, 1), opacity 200ms',
        }}
      />

      {busy ? (
        <div className="absolute inset-0 flex items-center justify-center text-white">{busyContent}</div>
      ) : (
        <span
          aria-hidden
          className="shimmer-text pointer-events-none absolute inset-0 flex items-center justify-center text-base font-semibold text-accent"
          style={{ opacity: 1 - progress * 1.4 }}
        >
          {label}
        </span>
      )}

      {!busy && (
        <button
          type="button"
          aria-label={`${label} (press Enter)`}
          disabled={locked}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              confirm()
            }
          }}
          className="absolute flex items-center justify-center rounded-full bg-white text-accent shadow-md outline-none focus-visible:ring-2 focus-visible:ring-accent touch-none cursor-grab active:cursor-grabbing"
          style={{
            top: PAD,
            left: PAD,
            width: THUMB,
            height: THUMB,
            transform: `translateX(${x}px)`,
            transition: dragging ? 'none' : 'transform 320ms cubic-bezier(0.34, 1.3, 0.64, 1)',
          }}
        >
          <ChevronsIcon />
        </button>
      )}
    </div>
  )
}
