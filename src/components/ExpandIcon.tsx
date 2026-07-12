/** Two arrows pointing away from a center line — “expand”. */
export function ExpandIcon({
  size = 20,
  strokeWidth = 2,
  className = 'shrink-0',
}: {
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
    >
      <path d="M12 9V4" strokeLinecap="round" />
      <path d="M9 7l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="M12 15v5" strokeLinecap="round" />
      <path d="M9 17l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
