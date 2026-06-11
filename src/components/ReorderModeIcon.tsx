/** Toolbar icon for entering/leaving exercise reorder mode (not the per-row drag grip). */
export function ReorderModeIcon({
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
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7h9M4 12h9M4 17h6" />
      <path d="M17 8l2-2 2 2" />
      <path d="M19 6v12" />
      <path d="M17 16l2 2 2-2" />
    </svg>
  )
}
