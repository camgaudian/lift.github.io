import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/hooks/useCountUp'
import { useTheme } from '@/contexts/ThemeContext'

const PIECE_COUNT = 80

/**
 * A lightweight, dependency-free confetti burst rendered with the Web Animations
 * API. Self-removing and a no-op when the user prefers reduced motion.
 */
export function Confetti() {
  const { accentColor } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const container = containerRef.current
    if (!container) return

    const colors = [accentColor, '#fbbf24', '#34d399', '#60a5fa', '#f472b6']
    const pieces: HTMLSpanElement[] = []

    for (let i = 0; i < PIECE_COUNT; i++) {
      const piece = document.createElement('span')
      const size = 6 + Math.random() * 6
      piece.style.position = 'absolute'
      piece.style.top = '0'
      piece.style.left = `${Math.random() * 100}%`
      piece.style.width = `${size}px`
      piece.style.height = `${size * (0.4 + Math.random())}px`
      piece.style.backgroundColor = colors[i % colors.length]
      piece.style.borderRadius = '1px'
      piece.style.opacity = '0'
      container.appendChild(piece)
      pieces.push(piece)

      const xDrift = (Math.random() - 0.5) * 240
      const rotation = (Math.random() - 0.5) * 720
      const duration = 1600 + Math.random() * 1200
      const delay = Math.random() * 250

      piece.animate(
        [
          { transform: 'translate(0, -10px) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${xDrift}px, 75vh) rotate(${rotation}deg)`,
            opacity: 1,
            offset: 0.85,
          },
          {
            transform: `translate(${xDrift}px, 90vh) rotate(${rotation}deg)`,
            opacity: 0,
          },
        ],
        { duration, delay, easing: 'cubic-bezier(0.25, 0.8, 0.4, 1)', fill: 'forwards' },
      )
    }

    const cleanup = window.setTimeout(() => {
      pieces.forEach((p) => p.remove())
    }, 3200)

    return () => {
      window.clearTimeout(cleanup)
      pieces.forEach((p) => p.remove())
    }
  }, [accentColor])

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200] overflow-hidden"
    />
  )
}
