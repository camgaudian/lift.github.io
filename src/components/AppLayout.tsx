import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <main
        ref={mainRef}
        className="mx-auto w-full max-w-lg min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6 pt-6 safe-top"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
