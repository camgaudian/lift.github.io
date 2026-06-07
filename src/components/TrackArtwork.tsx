function MusicIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

const sizeClasses = {
  sm: { box: 'h-8 w-8', rounded: 'rounded', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10', rounded: 'rounded', icon: 'h-4 w-4' },
  lg: { box: 'h-12 w-12', rounded: 'rounded-md', icon: 'h-5 w-5' },
} as const

export function TrackArtwork({
  url,
  size = 'md',
}: {
  url: string | null
  size?: keyof typeof sizeClasses
}) {
  const { box, rounded, icon } = sizeClasses[size]

  if (url) {
    return (
      <img src={url} alt="" className={`${box} shrink-0 ${rounded} object-cover`} />
    )
  }

  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center ${rounded} bg-surface-secondary`}
    >
      <MusicIcon className={`${icon} text-text-secondary`} />
    </div>
  )
}
