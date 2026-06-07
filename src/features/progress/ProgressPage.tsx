import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HistorySection } from './HistorySection'
import { StatsSection } from './StatsSection'

type ProgressTab = 'history' | 'stats'

export function ProgressPage() {
  const [tab, setTab] = useState<ProgressTab>('history')
  const [showAllRecent, setShowAllRecent] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setShowAllRecent(false)
  }, [location.pathname])

  useEffect(() => {
    if (tab !== 'history') setShowAllRecent(false)
  }, [tab])

  return (
    <div className="flex flex-col gap-4 pt-3">
      <h1 className="text-2xl font-semibold">Progress</h1>

      <div className="flex rounded-xl bg-surface-secondary p-1">
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            tab === 'history' ? 'bg-surface shadow-sm text-text' : 'text-text-secondary'
          }`}
        >
          History
        </button>
        <button
          type="button"
          onClick={() => setTab('stats')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            tab === 'stats' ? 'bg-surface shadow-sm text-text' : 'text-text-secondary'
          }`}
        >
          Stats
        </button>
      </div>

      {tab === 'history' ? (
        <HistorySection
          showAllRecent={showAllRecent}
          onShowAllRecentChange={setShowAllRecent}
        />
      ) : (
        <StatsSection />
      )}
    </div>
  )
}
