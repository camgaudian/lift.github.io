import { SelectHTMLAttributes, forwardRef, useId } from 'react'
import { FloatingLabel, NotchedOutline, notchedControlClass } from '@/components/NotchedField'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: boolean
}

// A dropdown always shows a value, so its label stays lifted in the top border.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error = false, id, className = '', disabled, children, ...props }, ref) => {
    const reactId = useId()
    const selectId = id ?? reactId

    return (
      <div className={['relative min-w-0 max-w-full', disabled ? 'opacity-60' : ''].join(' ')}>
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={error || undefined}
          {...props}
          className={[notchedControlClass, 'cursor-pointer appearance-none py-3 pr-10', className].join(' ')}
        >
          {children}
        </select>
        <NotchedOutline label={label} floated="always" error={error} />
        <FloatingLabel htmlFor={selectId} floated="always" error={error}>
          {label}
        </FloatingLabel>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-4 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-text-secondary"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
    )
  },
)
Select.displayName = 'Select'
