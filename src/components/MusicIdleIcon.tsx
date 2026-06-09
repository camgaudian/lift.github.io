export function MusicIdleIcon({
  className = '',
  size = 'sm',
  accentColor,
}: {
  className?: string
  size?: 'sm' | 'md'
  accentColor?: string
}) {
  const barClass = size === 'sm' ? 'h-[3.5px]' : 'h-1'

  return (
    <span
      className={`inline-flex shrink-0 items-end gap-0.5 opacity-45 ${accentColor ? '' : 'text-text-secondary'} ${className}`}
      style={accentColor ? { color: accentColor } : undefined}
      aria-hidden
    >
      <span className={`w-0.5 rounded-full bg-current ${barClass}`} />
      <span className={`w-0.5 rounded-full bg-current ${barClass}`} />
      <span className={`w-0.5 rounded-full bg-current ${barClass}`} />
    </span>
  )
}
