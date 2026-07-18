import { InputHTMLAttributes, forwardRef, useId, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: boolean
}

const TEMPORAL_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week'])

function formatTemporalDisplay(type: string, value: string): string {
  if (!value) return ''

  let date: Date
  if (type === 'time') {
    date = new Date(`1970-01-01T${value}`)
  } else if (type === 'date' || type === 'month') {
    date = new Date(`${value}T00:00`)
  } else {
    date = new Date(value)
  }
  if (Number.isNaN(date.getTime())) return value

  if (type === 'time') {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (type === 'date') {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  if (type === 'datetime-local') {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  return value
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, error = false, type, value, defaultValue, onChange, onFocus, onBlur, disabled, ...props }, ref) => {
    const reactId = useId()
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : reactId)
    const isTemporal = typeof type === 'string' && TEMPORAL_TYPES.has(type)
    const [focused, setFocused] = useState(false)

    const fieldClass = [
      'w-full min-w-0 max-w-full rounded-xl border bg-surface px-4 py-3 text-base text-text',
      'placeholder:text-text-secondary focus:outline-none focus:ring-2',
      error
        ? 'border-danger focus:border-danger focus:ring-danger/30'
        : 'border-border focus:ring-accent/30 focus:border-accent',
      className,
    ].join(' ')

    if (isTemporal) {
      const rawValue =
        value !== undefined
          ? String(value)
          : defaultValue !== undefined
            ? String(defaultValue)
            : ''
      const display = formatTemporalDisplay(type, rawValue)
      const faceRing = error
        ? focused
          ? 'border-danger ring-2 ring-danger/30'
          : 'border-danger'
        : focused
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-border'

      return (
        <div className="flex min-w-0 max-w-full flex-col gap-1">
          {label && (
            <label htmlFor={inputId} className="text-sm text-text-secondary">
              {label}
            </label>
          )}
          <div className="relative min-w-0 max-w-full overflow-hidden rounded-xl">
            <div
              aria-hidden
              className={[
                'w-full truncate rounded-xl border bg-surface px-4 py-3 text-base text-text',
                disabled ? 'opacity-60' : '',
                faceRing,
                className,
              ].join(' ')}
            >
              {display || '\u00a0'}
            </div>
            <input
              ref={ref}
              id={inputId}
              type={type}
              value={value}
              defaultValue={defaultValue}
              disabled={disabled}
              {...props}
              onChange={onChange}
              onFocus={(e) => {
                setFocused(true)
                onFocus?.(e)
              }}
              onBlur={(e) => {
                setFocused(false)
                onBlur?.(e)
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-w-0 max-w-full flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          {...props}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className={fieldClass}
        />
      </div>
    )
  },
)
Input.displayName = 'Input'
