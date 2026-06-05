import { InputHTMLAttributes, forwardRef } from 'react'

interface DisplayNameInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const DisplayNameInput = forwardRef<HTMLInputElement, DisplayNameInputProps>(
  ({ label, className = '', id, disabled, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-secondary">
            {label}
          </label>
        )}
        <div
          className={[
            'flex items-center rounded-xl border border-border bg-surface',
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent',
            disabled ? 'opacity-60' : '',
            className,
          ].join(' ')}
        >
          <span
            className="select-none pl-4 text-base text-text-secondary"
            aria-hidden
          >
            @
          </span>
          <input
            ref={ref}
            id={inputId}
            type="text"
            disabled={disabled}
            className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-4 pl-1 text-base text-text placeholder:text-text-secondary focus:outline-none"
            {...props}
          />
        </div>
      </div>
    )
  },
)
DisplayNameInput.displayName = 'DisplayNameInput'
