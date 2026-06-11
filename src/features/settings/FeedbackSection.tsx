import { useState } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { FeedbackModal } from '@/features/settings/FeedbackModal'

export function FeedbackSection() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card padding="sm" className="p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">Send feedback to developer</p>
            <p className="text-xs text-text-secondary">Bugs, ideas, or anything else</p>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => setOpen(true)}>
            Send
          </Button>
        </div>
      </Card>

      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  )
}
