import { ButtonHTMLAttributes, useRef } from 'react'

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export function Switch({ checked, onChange, label, disabled, className = '', ...props }: SwitchProps) {
  // Only play the stretch after a real toggle, not on first render.
  const toggled = useRef(false)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        toggled.current = true
        onChange(!checked)
      }}
      className={[
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-border',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      ].join(' ')}
      {...props}
    >
      <span
        aria-hidden
        className={[
          'pointer-events-none inline-block h-6 w-6 transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      >
        <span
          key={toggled.current ? String(checked) : 'initial'}
          className={[
            'block h-full w-full rounded-full bg-white shadow-sm',
            toggled.current ? (checked ? 'liquid-stretch-right' : 'liquid-stretch-left') : '',
          ].join(' ')}
        />
      </span>
    </button>
  )
}
