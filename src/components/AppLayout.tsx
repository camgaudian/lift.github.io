import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-6 safe-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
