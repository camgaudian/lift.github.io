import { InputHTMLAttributes } from 'react'
import { Input } from '@/components/Input'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
    </svg>
  )
}

export function SearchInput({ label, className = '', ...props }: SearchInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="pb-1 text-sm text-text-secondary">{label}</label>}
      <div className="relative">
        <SearchIcon />
        <Input className={['pl-10', className].filter(Boolean).join(' ')} {...props} />
      </div>
    </div>
  )
}
