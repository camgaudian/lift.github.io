import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ExercisesTab } from '@/features/exercises/ExercisesTab'
import { TemplatesTab } from '@/features/templates/TemplatesTab'
import { SegmentedControl } from '@/components/SegmentedControl'

export function LibraryPage() {
  const location = useLocation()
  const isTemplateDetail = location.pathname.includes('/templates/')
  const [tab, setTab] = useState<'exercises' | 'templates'>('exercises')
  // Slide direction follows the pill; none on first render.
  const [tabEnter, setTabEnter] = useState('')

  if (isTemplateDetail) {
    return <Outlet />
  }

  return (
    <div className="flex flex-col gap-4 pt-3">
      <h1 className="text-2xl font-bold tracking-tight">Library</h1>
      <SegmentedControl
        tabs={[
          { value: 'exercises', label: 'Exercises' },
          { value: 'templates', label: 'Templates' },
        ]}
        value={tab}
        onChange={(next: 'exercises' | 'templates') => {
          if (next === tab) return
          setTabEnter(next === 'exercises' ? 'tab-enter-left' : 'tab-enter-right')
          setTab(next)
        }}
      />
      <div key={tab} className={tabEnter}>
        {tab === 'exercises' ? <ExercisesTab /> : <TemplatesTab />}
      </div>
    </div>
  )
}
