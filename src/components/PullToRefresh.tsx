import { type ReactNode, useEffect, useRef, useState } from 'react'
import { AssemblingMonogram } from '@/components/LiftMark'

const TRIGGER = 64
const MAX_PULL = 96
const HOLD = 52

/**
 * Pull down from the top of the page to refresh. Installed PWAs don't get the
 * browser's own pull-to-refresh, so this adds it back. Works with the nearest
 * scrolling ancestor (the app's <main>). On desktop, click and drag down on
 * an empty part of the page to do the same.
 */
export function PullToRefresh({
  onRefresh,
  disabled = false,
  children,
}: {
  onRefresh: () => Promise<unknown>
  disabled?: boolean
  children: ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const scroller = root.closest('main') ?? document.scrollingElement
    let startY: number | null = null
    let startX = 0
    let axisLocked = false

    const setBoth = (value: number) => {
      pullRef.current = value
      setPull(value)
    }

    const onStart = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current || (scroller?.scrollTop ?? 0) > 0) return
      startY = e.touches[0].clientY
      startX = e.touches[0].clientX
      axisLocked = false
    }

    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const dy = e.touches[0].clientY - startY
      // Leave sideways gestures (charts, carousels) alone.
      if (!axisLocked) {
        const dx = e.touches[0].clientX - startX
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        axisLocked = true
        if (Math.abs(dx) > Math.abs(dy)) {
          startY = null
          return
        }
      }
      if (dy <= 0 || (scroller?.scrollTop ?? 0) > 0) {
        if (pullRef.current) setBoth(0)
        return
      }
      e.preventDefault()
      // Resistance grows the further you pull.
      setBoth(Math.min(MAX_PULL, dy * 0.45))
    }

    const onEnd = async () => {
      if (startY === null) return
      startY = null
      if (pullRef.current < TRIGGER) {
        setBoth(0)
        return
      }
      refreshingRef.current = true
      setRefreshing(true)
      setBoth(HOLD)
      try {
        await onRefreshRef.current()
      } finally {
        refreshingRef.current = false
        setRefreshing(false)
        setBoth(0)
      }
    }

    // Mouse: drag down from a non-interactive spot. Touch is handled above.
    const INTERACTIVE = 'a, button, input, textarea, select, label, [role="switch"]'
    let mousePulled = false

    const onMouseMove = (e: PointerEvent) => {
      if (startY === null) return
      const dy = e.clientY - startY
      if (dy <= 6) {
        if (pullRef.current) setBoth(0)
        return
      }
      mousePulled = true
      e.preventDefault()
      setBoth(Math.min(MAX_PULL, dy * 0.45))
    }

    const onMouseUp = () => {
      window.removeEventListener('pointermove', onMouseMove)
      window.removeEventListener('pointerup', onMouseUp)
      document.body.style.userSelect = ''
      // Swallow the click that follows a drag so nothing underneath fires.
      if (mousePulled) {
        const swallow = (ev: MouseEvent) => ev.stopPropagation()
        window.addEventListener('click', swallow, { capture: true, once: true })
        window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
      }
      void onEnd()
    }

    const onMouseDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      if (disabledRef.current || refreshingRef.current || (scroller?.scrollTop ?? 0) > 0) return
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return
      startY = e.clientY
      mousePulled = false
      document.body.style.userSelect = 'none'
      window.addEventListener('pointermove', onMouseMove)
      window.addEventListener('pointerup', onMouseUp)
    }

    root.addEventListener('touchstart', onStart, { passive: true })
    root.addEventListener('touchmove', onMove, { passive: false })
    root.addEventListener('touchend', onEnd)
    root.addEventListener('touchcancel', onEnd)
    root.addEventListener('pointerdown', onMouseDown)
    return () => {
      root.removeEventListener('touchstart', onStart)
      root.removeEventListener('touchmove', onMove)
      root.removeEventListener('touchend', onEnd)
      root.removeEventListener('touchcancel', onEnd)
      root.removeEventListener('pointerdown', onMouseDown)
      window.removeEventListener('pointermove', onMouseMove)
      window.removeEventListener('pointerup', onMouseUp)
    }
  }, [])

  const progress = Math.min(1, pull / TRIGGER)
  const settling = settleTransition(pull, refreshing)

  return (
    <div ref={rootRef} className="relative h-full">
      <div
        aria-hidden={!refreshing}
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        style={{ height: pull, opacity: progress, transition: settling }}
      >
        {/* The logo assembles as you pull, then its top piece bobs while refreshing. */}
        <div
          className="mt-auto mb-2"
          role={refreshing ? 'status' : undefined}
          aria-label={refreshing ? 'Refreshing' : undefined}
        >
          <AssemblingMonogram height={30} progress={refreshing ? 1 : progress} busy={refreshing} />
        </div>
      </div>
      <div className="h-full" style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: settling }}>
        {children}
      </div>
    </div>
  )
}

// Follow the finger while pulling; ease back when released or refreshing.
function settleTransition(pull: number, refreshing: boolean): string | undefined {
  return pull === 0 || refreshing ? 'transform 300ms cubic-bezier(0.34, 1.3, 0.64, 1), height 300ms, opacity 200ms' : undefined
}
