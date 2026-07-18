import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

export type AnimatedListItemPhase = 'idle' | 'busy' | 'exiting' | 'swapping'

const SLIDE_MS = 320

interface AnimatedListItemProps extends HTMLAttributes<HTMLDivElement> {
  phase: AnimatedListItemPhase
  /** During `swapping`, slides in from the right while children slide out left. */
  incoming?: ReactNode
  onAnimationComplete?: () => void
  /** Bottom spacing collapsed with the exit animation (use instead of parent `gap`). */
  spacingClassName?: string
  children: ReactNode
}

function CardBusyOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-surface/75">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  )
}

export function AnimatedListItem({
  phase,
  incoming,
  onAnimationComplete,
  spacingClassName = '',
  className = '',
  style,
  children,
  ...rest
}: AnimatedListItemProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [exitStyle, setExitStyle] = useState<CSSProperties | undefined>()
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onAnimationComplete)
  onCompleteRef.current = onAnimationComplete

  useEffect(() => {
    completedRef.current = false
  }, [phase])

  useEffect(() => {
    if (phase !== 'exiting' && phase !== 'swapping') {
      setExitStyle(undefined)
      return
    }

    // Height collapse only for delete; swap keeps its slot size.
    if (phase === 'exiting') {
      const el = outerRef.current
      if (!el) return

      const height = el.offsetHeight
      setExitStyle({
        height,
        overflow: 'hidden',
        transition: `height ${SLIDE_MS}ms ease, margin-bottom ${SLIDE_MS}ms ease`,
      })

      let collapseRaf2 = 0
      const collapseRaf1 = requestAnimationFrame(() => {
        collapseRaf2 = requestAnimationFrame(() => {
          setExitStyle({
            height: 0,
            marginBottom: 0,
            overflow: 'hidden',
            transition: `height ${SLIDE_MS}ms ease, margin-bottom ${SLIDE_MS}ms ease`,
          })
        })
      })

      const timer = window.setTimeout(() => {
        if (completedRef.current) return
        completedRef.current = true
        onCompleteRef.current?.()
      }, SLIDE_MS)

      return () => {
        cancelAnimationFrame(collapseRaf1)
        cancelAnimationFrame(collapseRaf2)
        window.clearTimeout(timer)
      }
    }

    const timer = window.setTimeout(() => {
      if (completedRef.current) return
      completedRef.current = true
      onCompleteRef.current?.()
    }, SLIDE_MS)

    return () => window.clearTimeout(timer)
  }, [phase])

  const locked = phase !== 'idle'

  return (
    <div
      ref={outerRef}
      className={[spacingClassName, className].filter(Boolean).join(' ')}
      style={{ ...style, ...exitStyle }}
      aria-busy={phase === 'busy' || undefined}
      {...rest}
    >
      {phase === 'swapping' && incoming ? (
        <div className="grid overflow-hidden">
          <div className="col-start-1 row-start-1 card-slide-out-left pointer-events-none">
            {children}
          </div>
          <div className="col-start-1 row-start-1 card-slide-in-right pointer-events-none">
            {incoming}
          </div>
        </div>
      ) : (
        <div
          className={[
            'relative',
            phase === 'exiting' ? 'card-slide-out-left' : '',
            locked ? 'pointer-events-none' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
          {phase === 'busy' && <CardBusyOverlay />}
        </div>
      )}
    </div>
  )
}
