import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text',
            'placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
    )
  },
)
Input.displayName = 'Input'
