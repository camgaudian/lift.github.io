export function SwapIcon({
  size = 18,
  className = 'shrink-0',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d="M16 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 7H4" strokeLinecap="round" />
      <path d="M8 21l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17h16" strokeLinecap="round" />
    </svg>
  )
}
