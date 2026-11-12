import { useState } from 'react'
import { StatsSection } from './StatsSection'
import { MilestonesSection } from './MilestonesSection'
import { SegmentedControl } from '@/components/SegmentedControl'

type ProgressTab = 'stats' | 'milestones'

export function ProgressPage() {
  const [tab, setTab] = useState<ProgressTab>('stats')
  // Slide direction follows the pill; none on first render.
  const [tabEnter, setTabEnter] = useState('')

  return (
    <div className="flex flex-col gap-4 pt-3">
      <h1 className="text-2xl font-bold tracking-tight">Progress</h1>

      <SegmentedControl
        tabs={[
          { value: 'stats', label: 'Stats' },
          { value: 'milestones', label: 'Milestones' },
        ]}
        value={tab}
        onChange={(next: ProgressTab) => {
          if (next === tab) return
          setTabEnter(next === 'stats' ? 'tab-enter-left' : 'tab-enter-right')
          setTab(next)
        }}
      />
      <div key={tab} className={tabEnter}>
        {tab === 'stats' ? <StatsSection /> : <MilestonesSection />}
      </div>
    </div>
  )
}
