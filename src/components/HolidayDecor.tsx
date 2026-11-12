import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/hooks/useCountUp'
import type { Holiday } from '@/lib/holidays'

/*
 * Seasonal decorations. Everything is drawn in the user's own accent tones
 * (the logo's deep/soft pair) plus the muted text color, so a holiday never
 * changes the app's palette — it only adds shapes.
 */

const DEEP = 'var(--color-accent-deep)'
const SOFT = 'var(--color-accent-soft)'
const PAGE = 'var(--color-surface-secondary)'

const tone = (i: number) => (i % 2 ? SOFT : DEEP)

/** Single-color shapes (currentColor) for particles and confetti. */
export const HOLIDAY_SHAPES = {
  leaf: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16z" fill="currentColor"/><path d="M4 20L13 11" stroke="${PAGE}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  snow: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M9.5 3.8L12 6.3l2.5-2.5M9.5 20.2L12 17.7l2.5 2.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" fill="currentColor"/></svg>',
  streamer: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 2c5 3-2 7 3 10s-2 7 3 10"/></svg>',
} as const

export type HolidayShape = keyof typeof HOLIDAY_SHAPES

export const AMBIENT_SHAPE: Record<Holiday, HolidayShape> = {
  thanksgiving: 'leaf',
  christmas: 'snow',
  newyear: 'star',
}

/** Confetti shapes cycled through for the finish-workout celebration. */
export const CONFETTI_SHAPES: Record<Holiday, HolidayShape[]> = {
  thanksgiving: ['leaf', 'leaf', 'star'],
  christmas: ['snow', 'star', 'snow'],
  newyear: ['streamer', 'star', 'streamer'],
}

/** A small hat perched on the top-left of the LIFT wordmark. */
export function WordmarkHat({ holiday }: { holiday: Holiday }) {
  const common = { 'aria-hidden': true, className: 'pointer-events-none absolute' } as const
  if (holiday === 'thanksgiving') {
    return (
      <svg {...common} viewBox="0 0 32 30" width={26} style={{ left: -6, top: -15, transform: 'rotate(-10deg)' }}>
        <path d="M16 9c0-3 1.5-5.5 4-7" stroke={DEEP} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M18 6c3-3 7-3 9-1-3 2-6 2.5-9 1z" fill={SOFT} />
        <g fill={DEEP} stroke={PAGE} strokeWidth="1.2">
          <ellipse cx="9" cy="19" rx="7" ry="9" />
          <ellipse cx="23" cy="19" rx="7" ry="9" />
          <ellipse cx="16" cy="19" rx="7" ry="10" />
        </g>
      </svg>
    )
  }
  if (holiday === 'christmas') {
    return (
      <svg {...common} viewBox="0 0 40 34" width={30} style={{ left: -10, top: -17, transform: 'rotate(-14deg)' }}>
        <path d="M6 26C9 12 22 2 33 10l-2 16z" fill={DEEP} />
        <circle cx="33" cy="11" r="4" fill={SOFT} />
        <rect x="3" y="23" width="32" height="7" rx="3.5" fill={SOFT} />
      </svg>
    )
  }
  return (
    <svg {...common} viewBox="0 0 30 36" width={27} style={{ left: -8, top: -26, transform: 'rotate(-12deg)' }}>
      <path d="M15 4L26 33H4z" fill={SOFT} />
      <path d="M9 21l11-4M7 27l15-5" stroke={DEEP} strokeWidth="2.4" />
      <circle cx="15" cy="4" r="3.4" fill={DEEP} />
    </svg>
  )
}

/** Ornament tucked over a card's top-right corner. The card must be `relative`. */
export function CardCornerOrnament({ holiday }: { holiday: Holiday }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 30"
      width={40}
      className="pointer-events-none absolute -top-2.5 right-2"
      fill="none"
      strokeLinecap="round"
    >
      {holiday === 'thanksgiving' && (
        <>
          <path d="M2 26C2 14 9 6 22 6c0 13-8 20-20 20z" fill={DEEP} transform="rotate(-20 12 15)" />
          <path d="M26 10h12c0 4-3 6-6 6s-6-2-6-6z" fill={SOFT} />
          <path d="M27 15c0 6 3 10 5 10s5-4 5-10z" fill={DEEP} />
          <path d="M32 10V7" stroke={DEEP} strokeWidth="1.6" />
        </>
      )}
      {holiday === 'christmas' && (
        <>
          <path d="M20 17C15 9 8 7 1 9c3 6 10 10 19 8z" fill={DEEP} />
          <path d="M20 17c5-8 12-10 19-8-3 6-10 10-19 8z" fill={DEEP} />
          <path d="M19 16C14 12 9 10.5 4 10.5M21 16c5-4 10-5.5 15-5.5" stroke={PAGE} strokeWidth="1" />
          <circle cx="17" cy="19" r="3" fill={SOFT} />
          <circle cx="23" cy="19" r="3" fill={SOFT} />
          <circle cx="20" cy="14" r="3" fill={SOFT} />
        </>
      )}
      {holiday === 'newyear' && (
        <>
          <path d="M30 15v-6M30 15l5-3M30 15l5 3M30 15v6M30 15l-5 3M30 15l-5-3" stroke={DEEP} strokeWidth="1.8" />
          <path d="M10 8c4 2-1 5 3 8s-1 6 3 8" stroke={SOFT} strokeWidth="2" />
        </>
      )}
    </svg>
  )
}

const PARTICLE_COUNT = 12

/**
 * A few slow-falling leaves / snowflakes / stars on a fixed layer. Render it
 * before the page content so cards and buttons always sit in front of it.
 */
export function HolidayParticles({ holiday }: { holiday: Holiday }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = ref.current
    if (!layer || prefersReducedMotion()) return

    const fall = window.innerHeight + 40
    const spin = holiday === 'thanksgiving' ? 200 : 90
    const animations: Animation[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const el = document.createElement('span')
      const size = 7 + Math.random() * 7
      Object.assign(el.style, {
        position: 'absolute',
        top: '0',
        left: `${Math.random() * 95}%`,
        width: `${size}px`,
        height: `${size}px`,
        color: tone(i),
        opacity: '0.45',
      })
      el.innerHTML = HOLIDAY_SHAPES[AMBIENT_SHAPE[holiday]]
      layer.appendChild(el)

      const sway = (Math.random() - 0.5) * 60
      animations.push(
        el.animate(
          [
            { transform: 'translate(0, -20px) rotate(0deg)' },
            { transform: `translate(${sway}px, ${fall / 2}px) rotate(${spin}deg)` },
            { transform: `translate(${-sway / 2}px, ${fall}px) rotate(${spin * 2}deg)` },
          ],
          { duration: 11000 + Math.random() * 7000, delay: -Math.random() * 14000, iterations: Infinity },
        ),
      )
    }

    return () => {
      animations.forEach((a) => a.cancel())
      layer.replaceChildren()
    }
  }, [holiday])

  return <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden" />
}

/** Replaces the ring spinner while a holiday is active. Uses the accent color. */
export function HolidaySpinner({ holiday }: { holiday: Holiday }) {
  if (holiday === 'newyear') {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 45} 12 12)`}>
            <g className="holiday-burst-ray" style={{ animationDelay: `${(i * 0.15).toFixed(2)}s` }}>
              <path d="M12 2.5v4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="9.6" r="1" fill="currentColor" />
            </g>
          </g>
        ))}
      </svg>
    )
  }
  return (
    <span
      aria-hidden
      className="block h-8 w-8 animate-spin text-accent [animation-duration:2.4s]"
      dangerouslySetInnerHTML={{ __html: HOLIDAY_SHAPES[AMBIENT_SHAPE[holiday]] }}
    />
  )
}

/** Icon for the slide-to-finish thumb (white thumb, accent icon). */
export function HolidayThumbIcon({ holiday }: { holiday: Holiday }) {
  if (holiday === 'thanksgiving') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <g fill="currentColor" stroke="white" strokeWidth="1">
          <ellipse cx="7.5" cy="14.5" rx="5" ry="6.5" />
          <ellipse cx="16.5" cy="14.5" rx="5" ry="6.5" />
          <ellipse cx="12" cy="14.5" rx="5" ry="7" />
        </g>
        <path d="M12 7.5c0-2 1-3.5 3-4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    )
  }
  if (holiday === 'christmas') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="14.5" r="7" fill="currentColor" />
        <rect x="9.5" y="5" width="5" height="3.5" rx="1" fill="currentColor" />
        <path d="M5.5 13.5c4 2 9 2 13 0" stroke="white" strokeWidth="1.4" fill="none" />
      </svg>
    )
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 21l4.5-11.5 7 7z" fill="currentColor" />
      <path d="M13 9c0-3 2-3 2-6M15 11c2-1 4 0 6-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19" cy="5" r="1.4" fill="currentColor" />
      <circle cx="11" cy="4" r="1.1" fill="currentColor" />
      <circle cx="20" cy="14" r="1.1" fill="currentColor" />
    </svg>
  )
}
