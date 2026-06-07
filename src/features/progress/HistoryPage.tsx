import { useEffect, useState } from 'react'
import { HistorySection } from './HistorySection'

export function HistoryPage() {
  const [showAllRecent, setShowAllRecent] = useState(false)

  useEffect(() => {
    setShowAllRecent(false)
  }, [])

  return (
    <div className="flex flex-col gap-4 pt-3">
      <h1 className="text-2xl font-semibold">History</h1>

      <HistorySection
        showAllRecent={showAllRecent}
        onShowAllRecentChange={setShowAllRecent}
      />
    </div>
  )
}
