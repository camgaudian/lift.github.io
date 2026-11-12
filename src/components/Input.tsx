import { InputHTMLAttributes, forwardRef, useId } from 'react'
import {
  FloatingLabel,
  NotchedOutline,
  deferredPlaceholderClass,
  notchedControlClass,
} from '@/components/NotchedField'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** When set, the field gets a floating label that lifts into the top border. */
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

// Keep Chrome's autofill tint off the field so it matches the surface.
const AUTOFILL_CLASS =
  'autofill:shadow-[inset_0_0_0_1000px_var(--color-surface)] autofill:[-webkit-text-fill-color:var(--color-text)]'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, error = false, type, placeholder, disabled, ...props }, ref) => {
    const reactId = useId()
    const inputId = id ?? reactId
    const isTemporal = typeof type === 'string' && TEMPORAL_TYPES.has(type)

    // Date/time pickers: a formatted face with the native input invisibly on top.
    // The label stays lifted since the face has no placeholder state to rest in.
    if (isTemporal) {
      const { value, defaultValue } = props
      const rawValue =
        value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ''
      const display = formatTemporalDisplay(type, rawValue)

      return (
        <div className={['relative min-w-0 max-w-full', disabled ? 'opacity-60' : ''].join(' ')}>
          <div
            aria-hidden
            className={[
              'w-full truncate rounded-xl bg-surface px-4 py-3 text-base text-text',
              label ? '' : `border ${error ? 'border-danger' : 'border-border'}`,
              className,
            ].join(' ')}
          >
            {display || ' '}
          </div>
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            {...props}
            className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          {label && (
            <>
              <NotchedOutline label={label} floated="always" error={error} />
              <FloatingLabel htmlFor={inputId} floated="always" error={error}>
                {label}
              </FloatingLabel>
            </>
          )}
        </div>
      )
    }

    if (label) {
      return (
        <div className={['relative min-w-0 max-w-full', disabled ? 'opacity-60' : ''].join(' ')}>
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            // A placeholder is required for the CSS-only float state; a real one
            // only appears once the label has lifted.
            placeholder={placeholder || ' '}
            aria-invalid={error || undefined}
            {...props}
            className={[
              notchedControlClass,
              'py-3',
              deferredPlaceholderClass,
              AUTOFILL_CLASS,
              className,
            ].join(' ')}
          />
          <NotchedOutline label={label} floated="auto" error={error} />
          <FloatingLabel htmlFor={inputId} floated="auto" error={error}>
            {label}
          </FloatingLabel>
        </div>
      )
    }

    return (
      <div className="flex min-w-0 max-w-full flex-col">
        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error || undefined}
          {...props}
          className={[
            'w-full min-w-0 max-w-full rounded-xl border bg-surface px-4 py-3 text-base text-text',
            'placeholder:text-text-secondary focus:outline-none focus:ring-2',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/30'
              : 'border-border focus:ring-accent/30 focus:border-accent',
            className,
          ].join(' ')}
        />
      </div>
    )
  },
)
Input.displayName = 'Input'
