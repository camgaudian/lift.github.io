import { useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { SwapIcon } from '@/components/SwapIcon'
import { ExercisePickerPanel } from '@/features/exercises/ExercisePicker'
import { iconToolbarButtonClass } from '@/lib/ui'
import type { Exercise } from '@/lib/types'

interface ExerciseSwapButtonProps {
  exerciseName: string
  exercises: Exercise[]
  excludeIds?: Iterable<string>
  onSwap: (exerciseId: string) => void | Promise<void>
  /** Overrides the default trigger button styling (e.g. for a corner-anchored variant). */
  className?: string
  iconSize?: number
}

export function ExerciseSwapButton({
  exerciseName,
  exercises,
  excludeIds,
  onSwap,
  className,
  iconSize,
}: ExerciseSwapButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [pending, setPending] = useState<Exercise | null>(null)

  const closeAll = () => {
    setShowPicker(false)
    setPending(null)
  }

  const handleSelect = (exerciseId: string) => {
    const ex = exercises.find((e) => e.id === exerciseId)
    if (!ex) return
    setShowPicker(false)
    setPending(ex)
  }

  const confirmSwap = () => {
    if (!pending) return
    const nextId = pending.id
    setPending(null)
    void Promise.resolve(onSwap(nextId)).catch(() => {
      // Parent restores the card UI on failure.
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className={className ?? `${iconToolbarButtonClass} hover:text-text`}
        aria-label={`Swap ${exerciseName}`}
      >
        <SwapIcon size={iconSize} />
      </button>

      {showPicker && (
        <BottomSheet
          title={`Swap ${exerciseName}`}
          onClose={closeAll}
          scrollable
          showCloseButton
        >
          <ExercisePickerPanel
            exercises={exercises}
            excludeIds={excludeIds}
            onSelect={handleSelect}
          />
        </BottomSheet>
      )}

      {pending && (
        <Modal title="Swap exercise?" onClose={closeAll}>
          <p className="text-sm text-text-secondary">
            Swap <span className="font-medium text-text">{exerciseName}</span> with{' '}
            <span className="font-medium text-text">{pending.name}</span>?
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button fullWidth onClick={confirmSwap}>
              Swap
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
