import type { CSSProperties } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { MONOGRAM, WORDMARK, brandShades } from '@/lib/brandMark'

interface LiftMarkProps {
  /** Rendered height in px; width follows the mark's aspect ratio. */
  height?: number
  /** Override the accent the two tones are derived from (defaults to the user's color). */
  color?: string
  className?: string
  /** Accessible label; omit for a decorative mark. */
  title?: string
  /** Play the snap-in (pieces drop in and settle) when the mark mounts. */
  animate?: boolean
}

/** Snap-in timing for `animate`: first piece starts as the auth slide settles. */
const SNAP_START_MS = 280
const SNAP_STAGGER_MS = 90

function groupByLetter<T extends { letter: number }>(pieces: readonly T[]): T[][] {
  const groups: T[][] = []
  for (const piece of pieces) (groups[piece.letter] ??= []).push(piece)
  return groups
}

function Mark({
  shape,
  height,
  color,
  className = '',
  title,
  animate = false,
}: LiftMarkProps & { shape: typeof WORDMARK | typeof MONOGRAM; height: number }) {
  const { accentColor } = useTheme()
  const { deep, soft } = brandShades(color ?? accentColor)
  const [, , w, h] = shape.viewBox.split(' ').map(Number)

  return (
    <svg
      width={(height * w) / h}
      height={height}
      viewBox={shape.viewBox}
      className={`shrink-0 ${animate ? 'overflow-visible' : ''} ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {animate ? (
        groupByLetter(shape.pieces).map((pieces, i) => {
          // Wordmark letters zip together (L rises, I drops, F rises, T drops); the monogram drops in.
          const fromBelow = shape === WORDMARK && i % 2 === 0
          return (
            <g
              key={i}
              className={`lift-mark-piece ${shape === WORDMARK ? 'lift-mark-piece-subtle' : ''}`}
              style={{
                animationDelay: `${SNAP_START_MS + i * SNAP_STAGGER_MS}ms`,
                ...(fromBelow ? { '--piece-dir': '1' } : null),
              } as CSSProperties}
            >
              {pieces.map((piece, j) => (
                <path
                  key={j}
                  d={piece.d}
                  fill={piece.tone === 'deep' ? deep : soft}
                  style={{ transition: 'fill 200ms ease' }}
                />
              ))}
            </g>
          )
        })
      ) : (
        <>
          <path d={shape.deep} fill={deep} style={{ transition: 'fill 200ms ease' }} />
          <path d={shape.soft} fill={soft} style={{ transition: 'fill 200ms ease' }} />
        </>
      )}
    </svg>
  )
}

/** Full modular LIFT wordmark, tinted with the user's accent. */
export function LiftWordmark({ height = 28, ...rest }: LiftMarkProps) {
  return <Mark shape={WORDMARK} height={height} {...rest} />
}

/** Compact L monogram, tinted with the user's accent. */
export function LiftMonogram({ height = 24, ...rest }: LiftMarkProps) {
  return <Mark shape={MONOGRAM} height={height} {...rest} />
}

interface AssemblingMonogramProps {
  height?: number
  /**
   * 0–1 drives the assembly by hand (pull-to-refresh): the L rises in first, then the
   * top piece drops onto it. Omit to play the snap-in animation once on mount.
   */
  progress?: number
  /** Keep the top piece bobbing while something loads. */
  busy?: boolean
  className?: string
}

/** L monogram whose two pieces snap together. Uses the --color-accent-deep/soft tokens. */
export function AssemblingMonogram({ height = 32, progress, busy = false, className = '' }: AssemblingMonogramProps) {
  const [, , w, h] = MONOGRAM.viewBox.split(' ').map(Number)
  const manual = progress !== undefined
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  const deepT = manual ? clamp(progress / 0.6) : 1
  const softT = manual ? clamp((progress - 0.4) / 0.6) : 1

  return (
    <svg
      width={(height * w) / h}
      height={height}
      viewBox={MONOGRAM.viewBox}
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden
    >
      <path
        d={MONOGRAM.deep}
        fill="var(--color-accent-deep)"
        className={manual ? undefined : 'lift-snap-in-svg'}
        style={manual ? { opacity: deepT, transform: `translateY(${(1 - deepT) * 140}px)` } : undefined}
      />
      <g
        className={manual ? undefined : 'lift-snap-in-svg'}
        style={
          manual
            ? { opacity: softT, transform: `translateY(${-(1 - softT) * 220}px)` }
            : { animationDelay: '180ms' }
        }
      >
        <path d={MONOGRAM.soft} fill="var(--color-accent-soft)" className={busy ? 'lift-piece-bob' : undefined} />
      </g>
    </svg>
  )
}
