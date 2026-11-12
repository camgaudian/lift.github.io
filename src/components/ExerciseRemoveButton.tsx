import { DeletePillButton } from '@/components/DeletePillButton'
import { TrashIcon } from '@/components/TrashIcon'

interface ExerciseRemoveButtonProps {
  exerciseName: string
  onRemove: () => void | Promise<void>
  /** `corner` is the exercise card's bottom-right button; `inline` sits in a row. */
  variant?: 'corner' | 'inline'
}

/** Trash icon that turns into a "Remove" pill; a second tap removes the exercise. */
export function ExerciseRemoveButton({
  exerciseName,
  onRemove,
  variant = 'inline',
}: ExerciseRemoveButtonProps) {
  return (
    <DeletePillButton
      icon={<TrashIcon size={18} />}
      label="Remove"
      ariaLabel={`Remove ${exerciseName}`}
      variant={variant}
      onConfirm={() => {
        void Promise.resolve(onRemove()).catch(() => {
          // Parent restores the card UI on failure.
        })
      }}
    />
  )
}
