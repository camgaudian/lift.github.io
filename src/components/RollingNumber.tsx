import { useEffect, useState } from 'react'

const LINE_EM = 1.25
// Two passes of 0–9 so every digit spins at least one full turn before landing.
const REEL = Array.from({ length: 20 }, (_, i) => i % 10)

/**
 * Odometer-style reveal: each digit in `value` rolls into place, left to
 * right. Non-digit characters (units, separators) are shown as-is.
 */
export function RollingNumber({
  value,
  delayMs = 0,
  className = '',
}: {
  value: string
  delayMs?: number
  className?: string
}) {
  const [rolled, setRolled] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setRolled(true), 40)
    return () => window.clearTimeout(timer)
  }, [])

  const chars = [...value]
  let digitIndex = 0

  return (
    <span className={`inline-flex items-baseline tabular-nums ${className}`} aria-label={value} role="img">
      {chars.map((char, i) => {
        if (!/\d/.test(char)) {
          return (
            <span key={i} aria-hidden className="whitespace-pre">
              {char}
            </span>
          )
        }
        const target = 10 + Number(char)
        const delay = delayMs + digitIndex++ * 70
        return (
          <span
            key={i}
            aria-hidden
            className="relative inline-block overflow-hidden"
            style={{ height: `${LINE_EM}em`, lineHeight: `${LINE_EM}em` }}
          >
            <span
              className="rolling-digit flex flex-col"
              style={{
                transform: `translateY(-${(rolled ? target : 0) * LINE_EM}em)`,
                transitionDelay: `${delay}ms`,
              }}
            >
              {REEL.map((d, j) => (
                <span key={j} className="block text-center">
                  {d}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
