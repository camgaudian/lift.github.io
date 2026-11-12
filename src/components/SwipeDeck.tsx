import { type ReactNode, useRef, useState } from 'react'

const SWIPE_THRESHOLD = 70
const FLY_MS = 220
const VISIBLE_DEPTH = 3

function ArrowIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

/**
 * A stack of cards: throw the top card off either side to reveal the next one.
 * The back arrow flies the previous card back in from the left. Taps on
 * buttons inside a card never start a drag.
 */
export function SwipeDeck<T>({
  items,
  getKey,
  renderCard,
  cardHeightClass = 'h-40',
}: {
  items: T[]
  getKey: (item: T) => string
  renderCard: (item: T) => ReactNode
  cardHeightClass?: string
}) {
  const [index, setIndex] = useState(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flying, setFlying] = useState<-1 | 1 | null>(null)
  const [entering, setEntering] = useState(false)
  const dragRef = useRef<{ pointerId: number; startX: number } | null>(null)
  const count = items.length

  const busy = flying !== null || entering

  // Either direction sends the top card to the back of the deck.
  const throwCard = (dir: -1 | 1) => {
    if (busy || count < 2) return
    setFlying(dir)
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % count)
      setFlying(null)
      setDx(0)
    }, FLY_MS)
  }

  // Bring the previous card back: place it off-screen left, then let it fly in.
  const goBack = () => {
    if (busy || count < 2) return
    setIndex((i) => (i - 1 + count) % count)
    setEntering(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy || count < 2) return
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX }
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    setDx(e.clientX - drag.startX)
  }

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (dx <= -SWIPE_THRESHOLD) throwCard(-1)
    else if (dx >= SWIPE_THRESHOLD) throwCard(1)
    else setDx(0)
  }

  if (count === 0) return null

  const visible = Array.from({ length: Math.min(VISIBLE_DEPTH, count) }, (_, depth) => ({
    depth,
    item: items[(index + depth) % count],
  }))

  return (
    <div>
      <div className={`relative ${cardHeightClass}`}>
        {visible
          .slice()
          .reverse()
          .map(({ depth, item }) => {
            const isTop = depth === 0
            // Cards behind peek out to the right, hinting at a sideways swipe.
            // While the top card leaves, the rest move forward one slot.
            const slot = flying && !isTop ? depth - 1 : depth
            let transform = `translateX(${slot * 12}px) scaleY(${1 - slot * 0.08})`
            if (isTop) {
              const x = entering ? -420 : flying ? flying * 420 : dx
              transform = `translateX(${x}px) rotate(${x / 18}deg)`
            }
            return (
              <div
                key={getKey(item)}
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerEnd : undefined}
                onPointerCancel={isTop ? onPointerEnd : undefined}
                aria-hidden={!isTop}
                inert={!isTop}
                className={[
                  'absolute inset-y-0 left-0 right-6 rounded-2xl border border-border bg-surface shadow-sm',
                  isTop && count > 1 ? 'touch-pan-y cursor-grab active:cursor-grabbing' : '',
                ].join(' ')}
                style={{
                  transform,
                  opacity: isTop && (flying || entering) ? 0 : 1 - slot * 0.18,
                  zIndex: VISIBLE_DEPTH - depth,
                  transition: isTop && (dragging || entering) ? 'none' : `transform ${FLY_MS + 60}ms cubic-bezier(0.34, 1.2, 0.64, 1), opacity ${FLY_MS}ms`,
                }}
              >
                {renderCard(item)}
              </div>
            )
          })}
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary hover:text-accent"
            aria-label="Previous template"
          >
            <ArrowIcon />
          </button>
          <p className="text-sm tabular-nums text-text-secondary" aria-live="polite">
            {index + 1} / {count} · swipe to browse
          </p>
          <button
            type="button"
            onClick={() => throwCard(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary hover:text-accent"
            aria-label="Next template"
          >
            <ArrowIcon flip />
          </button>
        </div>
      )}
    </div>
  )
}
