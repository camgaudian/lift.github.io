import { useState } from 'react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { TrashIcon } from '@/components/TrashIcon'
import { iconDeleteButtonClass } from '@/lib/ui'

interface ExerciseRemoveButtonProps {
  exerciseName: string
  onRemove: () => void | Promise<void>
  fromLabel?: string
  /** Overrides the default trigger button styling (e.g. for a corner-anchored variant). */
  className?: string
  iconSize?: number
}

export function ExerciseRemoveButton({
  exerciseName,
  onRemove,
  fromLabel = 'workout',
  className,
  iconSize,
}: ExerciseRemoveButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const confirmRemove = () => {
    setShowConfirm(false)
    void Promise.resolve(onRemove()).catch(() => {
      // Parent restores the card UI on failure.
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={className ?? iconDeleteButtonClass}
        aria-label={`Remove ${exerciseName}`}
      >
        <TrashIcon size={iconSize} />
      </button>
      {showConfirm && (
        <Modal title="Remove exercise?" onClose={() => setShowConfirm(false)}>
          <p className="text-sm text-text-secondary">
            Remove <span className="font-medium text-text">{exerciseName}</span> from this{' '}
            {fromLabel}?
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" fullWidth onClick={confirmRemove}>
              Remove
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
