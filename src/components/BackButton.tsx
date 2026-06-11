import { Link, type LinkProps } from 'react-router-dom'
import { backButtonClass } from '@/lib/ui'

function BackChevron() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BackButton({
  to,
  label,
  state,
}: {
  to: LinkProps['to']
  label: string
  state?: LinkProps['state']
}) {
  return (
    <Link to={to} state={state} className={backButtonClass} aria-label={label}>
      <BackChevron />
    </Link>
  )
}
