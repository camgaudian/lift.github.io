export function ReuseIcon({
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
      <path
        d="M21 12a9 9 0 0 0-15.5-6.3L3 8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3 12a9 9 0 0 0 15.5 6.3L21 16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 21v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
