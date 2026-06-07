import { useState } from 'react'
import { StatsSection } from './StatsSection'
import { MilestonesSection } from './MilestonesSection'

type ProgressTab = 'stats' | 'milestones'

export function ProgressPage() {
  const [tab, setTab] = useState<ProgressTab>('stats')

  return (
    <div className="flex flex-col gap-4 pt-3">
      <h1 className="text-2xl font-semibold">Progress</h1>

      <div className="flex rounded-xl bg-surface-secondary p-1">
        <button
          type="button"
          onClick={() => setTab('stats')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            tab === 'stats' ? 'bg-surface shadow-sm text-text' : 'text-text-secondary'
          }`}
        >
          Stats
        </button>
        <button
          type="button"
          onClick={() => setTab('milestones')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            tab === 'milestones' ? 'bg-surface shadow-sm text-text' : 'text-text-secondary'
          }`}
        >
          Milestones
        </button>
      </div>

      {tab === 'stats' ? <StatsSection /> : <MilestonesSection />}
    </div>
  )
}
