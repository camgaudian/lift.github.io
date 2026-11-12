interface SegmentedProgressProps {
  /** 0–100 */
  percent: number
  segments?: number
  className?: string
}

/**
 * Progress bar split into blocks, echoing the modular logo:
 * finished blocks use the deep accent shade, the block in progress uses the soft shade.
 */
export function SegmentedProgress({ percent, segments = 10, className = '' }: SegmentedProgressProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const filled = (clamped / 100) * segments

  return (
    <div
      className={`flex h-1.5 gap-[3px] ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      {Array.from({ length: segments }, (_, i) => {
        const state = i + 1 <= filled ? 'done' : i < filled ? 'partial' : 'empty'
        return (
          <span
            key={i}
            className={[
              'flex-1 rounded-full transition-colors duration-500',
              state === 'done' ? 'bg-accent-deep' : state === 'partial' ? 'bg-accent-soft' : 'bg-surface-secondary',
            ].join(' ')}
            style={{ transitionDelay: `${i * 40}ms` }}
          />
        )
      })}
    </div>
  )
}
