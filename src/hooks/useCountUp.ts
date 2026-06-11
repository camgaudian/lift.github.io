import { useEffect, useRef, useState } from 'react'

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Animates a number from 0 up to `target` with an ease-out curve. Returns the
 * final value immediately when disabled, when the target is 0, or when the user
 * prefers reduced motion.
 */
export function useCountUp(
  target: number,
  { duration = 700, enabled = true }: { duration?: number; enabled?: boolean } = {},
): number {
  const skip = !enabled || target === 0 || prefersReducedMotion()
  const [value, setValue] = useState(() => (skip ? target : 0))
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (skip) {
      setValue(target)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setValue(target)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration, skip])

  return value
}
