import { TextareaHTMLAttributes, forwardRef, useId } from 'react'
import {
  FloatingLabel,
  NotchedOutline,
  deferredPlaceholderClass,
  notchedControlClass,
} from '@/components/NotchedField'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: boolean
}

// Multi-line field with the same floating label. At rest the label sits on the
// first line instead of the vertical center.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error = false, id, className = '', placeholder, disabled, ...props }, ref) => {
    const reactId = useId()
    const textareaId = id ?? reactId

    return (
      <div className={['relative min-w-0 max-w-full', disabled ? 'opacity-60' : ''].join(' ')}>
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          placeholder={placeholder || ' '}
          aria-invalid={error || undefined}
          {...props}
          className={[notchedControlClass, 'py-3', deferredPlaceholderClass, className].join(' ')}
        />
        <NotchedOutline label={label} floated="auto" error={error} />
        <FloatingLabel htmlFor={textareaId} floated="auto" error={error} restClass="top-6">
          {label}
        </FloatingLabel>
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
