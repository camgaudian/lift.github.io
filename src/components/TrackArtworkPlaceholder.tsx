const sizeClasses = {
  sm: { box: 'h-8 w-8', rounded: 'rounded', icon: 'h-3 w-3' },
  md: { box: 'h-10 w-10', rounded: 'rounded', icon: 'h-3.5 w-3.5' },
  lg: { box: 'h-12 w-12', rounded: 'rounded-md', icon: 'h-4 w-4' },
  xl: { box: 'h-20 w-20', rounded: 'rounded-lg', icon: 'h-5 w-5' },
} as const

function PauseIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

export function TrackArtworkPlaceholder({
  accentColor,
  size = 'lg',
}: {
  accentColor: string
  size?: keyof typeof sizeClasses
}) {
  const { box, rounded, icon } = sizeClasses[size]

  return (
    <div
      className={`${box} ${rounded} relative shrink-0 overflow-hidden`}
      style={{ backgroundColor: `${accentColor}14` }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${accentColor}08 0%, ${accentColor}28 100%)`,
        }}
      />
      <div
        className={`absolute inset-0 ${rounded}`}
        style={{ boxShadow: `inset 0 0 0 1px ${accentColor}22` }}
      />
      <div
        className="relative flex h-full w-full items-center justify-center opacity-40"
        style={{ color: accentColor }}
      >
        <PauseIcon className={icon} />
      </div>
    </div>
  )
}
