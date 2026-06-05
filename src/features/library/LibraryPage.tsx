import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ExercisesTab } from '@/features/exercises/ExercisesTab'
import { TemplatesTab } from '@/features/templates/TemplatesTab'

export function LibraryPage() {
  const location = useLocation()
  const isTemplateDetail = location.pathname.includes('/templates/')
  const [tab, setTab] = useState<'exercises' | 'templates'>('exercises')

  if (isTemplateDetail) {
    return <Outlet />
  }

  return (
    <div className="flex flex-col gap-4 pt-3">
      <h1 className="text-2xl font-semibold">Library</h1>
      <div className="flex rounded-xl bg-surface-secondary p-1">
        <button
          type="button"
          onClick={() => setTab('exercises')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === 'exercises' ? 'bg-surface shadow-sm' : 'text-text-secondary'}`}
        >
          Exercises
        </button>
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === 'templates' ? 'bg-surface shadow-sm' : 'text-text-secondary'}`}
        >
          Templates
        </button>
      </div>
      {tab === 'exercises' ? <ExercisesTab /> : <TemplatesTab />}
    </div>
  )
}
