import { useState } from 'react'
import { AssistantFab } from './AssistantFab'
import { AssistantSheet } from './AssistantSheet'
import type { WorkoutContextPayload } from './assistantApi'

interface AssistantLauncherProps {
  workoutContext?: WorkoutContextPayload
  /** Extra bottom offset (e.g. above workout footer). Default clears bottom nav. */
  bottomClassName?: string
}

export function AssistantLauncher({
  workoutContext,
  bottomClassName = 'bottom-24',
}: AssistantLauncherProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className={[
          'pointer-events-none fixed right-5 z-40',
          bottomClassName,
        ].join(' ')}
      >
        <AssistantFab onClick={() => setOpen(true)} />
      </div>
      {open && (
        <AssistantSheet
          onClose={() => setOpen(false)}
          workoutContext={workoutContext}
        />
      )}
    </>
  )
}
