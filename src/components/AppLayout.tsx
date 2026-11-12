import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { PullToRefresh } from './PullToRefresh'
import { PushPermissionPrompt } from '@/features/settings/PushPermissionPrompt'

export function AppLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Remounting the page makes it refetch its data, like a reload.
  const refresh = useCallback(async () => {
    setRefreshKey((k) => k + 1)
    await new Promise((resolve) => window.setTimeout(resolve, 700))
  }, [])

  // Not while logging or editing: a remount could drop unsaved input.
  const refreshDisabled = /^\/workout\/|^\/library\/templates\//.test(pathname)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <main
        ref={mainRef}
        className="mx-auto w-full max-w-lg min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-28 pt-6 safe-top"
      >
        <PullToRefresh onRefresh={refresh} disabled={refreshDisabled}>
          <Outlet key={refreshKey} />
          {/* The pull wrapper is screen-height, so long pages overflow it and
              main's pb-28 lands under the nav, not after the content. This
              spacer keeps the end of the page scrollable clear of the nav. */}
          <div aria-hidden="true" className="h-28" />
        </PullToRefresh>
      </main>
      <BottomNav />
      <PushPermissionPrompt />
    </div>
  )
}
