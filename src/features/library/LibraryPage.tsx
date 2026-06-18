import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ExercisesTab } from '@/features/exercises/ExercisesTab'
import { TemplatesTab } from '@/features/templates/TemplatesTab'
import { SegmentedControl } from '@/components/SegmentedControl'

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
      <SegmentedControl
        tabs={[
          { value: 'exercises', label: 'Exercises' },
          { value: 'templates', label: 'Templates' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'exercises' ? <ExercisesTab /> : <TemplatesTab />}
    </div>
  )
}
