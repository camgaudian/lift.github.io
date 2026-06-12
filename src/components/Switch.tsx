import { ButtonHTMLAttributes } from 'react'

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export function Switch({ checked, onChange, label, disabled, className = '', ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
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
          'pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}
