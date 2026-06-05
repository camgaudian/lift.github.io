import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4 safe-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
