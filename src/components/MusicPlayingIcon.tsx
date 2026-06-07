export function MusicPlayingIcon({
  className = '',
  size = 'sm',
  accentColor,
}: {
  className?: string
  size?: 'sm' | 'md'
  accentColor?: string
}) {
  const barClass = size === 'sm' ? 'music-bar-sm' : 'music-bar-md'

  return (
    <span
      className={`inline-flex shrink-0 items-end gap-0.5 ${accentColor ? '' : 'text-accent'} ${className}`}
      style={accentColor ? { color: accentColor } : undefined}
      aria-hidden
    >
      <span className={`music-bar ${barClass} music-bar-delay-0`} />
      <span className={`music-bar ${barClass} music-bar-delay-1`} />
      <span className={`music-bar ${barClass} music-bar-delay-2`} />
    </span>
  )
}
