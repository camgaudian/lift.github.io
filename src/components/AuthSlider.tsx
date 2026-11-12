import { ReactNode, useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

/** Left-to-right order of the auth screens; moving to a later one slides left. */
const ORDER = ['/login', '/signup']
const SLIDE_MS = 480

type Slide = { key: string; element: ReactNode }

/**
 * Layout route for the login and sign-up screens. When the path changes it keeps the
 * outgoing screen rendered next to the incoming one and slides them sideways.
 */
export function AuthSlider() {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const [current, setCurrent] = useState<Slide>({ key: pathname, element: outlet })
  const [leaving, setLeaving] = useState<{ slide: Slide; forward: boolean } | null>(null)

  // New path: the screen on display becomes the leaving one (state adjusted during render).
  if (pathname !== current.key) {
    const forward = ORDER.indexOf(pathname) > ORDER.indexOf(current.key)
    setLeaving({ slide: current, forward })
    setCurrent({ key: pathname, element: outlet })
  } else if (current.element !== outlet) {
    setCurrent({ key: pathname, element: outlet })
  }

  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => setLeaving(null), SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [leaving])

  const slides: { slide: Slide; className: string; isLeaving: boolean }[] = [
    {
      slide: current,
      className: leaving ? (leaving.forward ? 'auth-slide-in-right' : 'auth-slide-in-left') : '',
      isLeaving: false,
    },
  ]
  if (leaving) {
    slides.push({
      slide: leaving.slide,
      className: leaving.forward ? 'auth-slide-out-left' : 'auth-slide-out-right',
      isLeaving: true,
    })
  }

  return (
    <div className="auth-slider">
      {slides.map(({ slide, className, isLeaving }) => (
        <div
          key={slide.key}
          className={`auth-slide ${className}`}
          aria-hidden={isLeaving || undefined}
          inert={isLeaving || undefined}
          style={isLeaving ? { pointerEvents: 'none' } : undefined}
        >
          {slide.element}
        </div>
      ))}
    </div>
  )
}
