import { InputHTMLAttributes, forwardRef, useId } from 'react'
import { FloatingLabel, NotchedOutline, notchedControlClass } from '@/components/NotchedField'

interface DisplayNameInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'placeholder'> {
  label: string
}

// Username field: floating label, with an "@" prefix that appears once the
// label has lifted out of the way.
export const DisplayNameInput = forwardRef<HTMLInputElement, DisplayNameInputProps>(
  ({ label, className = '', id, disabled, ...props }, ref) => {
    const reactId = useId()
    const inputId = id ?? reactId

    return (
      <div className={['relative min-w-0 max-w-full', disabled ? 'opacity-60' : ''].join(' ')}>
        <input
          ref={ref}
          id={inputId}
          type="text"
          disabled={disabled}
          placeholder=" "
          {...props}
          className={[notchedControlClass, 'py-3 pl-8', className].join(' ')}
        />
        <NotchedOutline label={label} floated="auto" />
        <FloatingLabel htmlFor={inputId} floated="auto">
          {label}
        </FloatingLabel>
        <span
          aria-hidden
          className={[
            'pointer-events-none absolute left-4 top-1/2 z-20 -translate-y-1/2 select-none text-base text-text-secondary',
            'opacity-0 transition-opacity duration-200 motion-reduce:transition-none',
            'peer-focus:opacity-100 peer-[:not(:placeholder-shown)]:opacity-100',
          ].join(' ')}
        >
          @
        </span>
      </div>
    )
  },
)
DisplayNameInput.displayName = 'DisplayNameInput'
