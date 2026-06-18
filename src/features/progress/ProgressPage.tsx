import { useState } from 'react'
import { StatsSection } from './StatsSection'
import { MilestonesSection } from './MilestonesSection'
import { SegmentedControl } from '@/components/SegmentedControl'

type ProgressTab = 'stats' | 'milestones'

export function ProgressPage() {
  const [tab, setTab] = useState<ProgressTab>('stats')

  return (
    <div className="flex flex-col gap-4 pt-3">
      <h1 className="text-2xl font-semibold">Progress</h1>

      <SegmentedControl
        tabs={[
          { value: 'stats', label: 'Stats' },
          { value: 'milestones', label: 'Milestones' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'stats' ? <StatsSection /> : <MilestonesSection />}
    </div>
  )
}
