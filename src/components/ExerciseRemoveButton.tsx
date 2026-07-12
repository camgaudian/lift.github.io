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
  const [removing, setRemoving] = useState(false)

  const confirmRemove = async () => {
    setRemoving(true)
    try {
      await onRemove()
      setShowConfirm(false)
    } finally {
      setRemoving(false)
    }
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
        <Modal title="Remove exercise?" onClose={() => !removing && setShowConfirm(false)}>
          <p className="text-sm text-text-secondary">
            Remove <span className="font-medium text-text">{exerciseName}</span> from this{' '}
            {fromLabel}?
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={removing}
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth disabled={removing} onClick={confirmRemove}>
              {removing ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
