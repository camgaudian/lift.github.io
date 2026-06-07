export function MusicPlayingIcon({
  className = '',
  size = 'sm',
}: {
  className?: string
  size?: 'sm' | 'md'
}) {
  const barClass = size === 'sm' ? 'music-bar-sm' : 'music-bar-md'

  return (
    <span
      className={`inline-flex shrink-0 items-end gap-0.5 text-accent ${className}`}
      aria-hidden
    >
      <span className={`music-bar ${barClass} music-bar-delay-0`} />
      <span className={`music-bar ${barClass} music-bar-delay-1`} />
      <span className={`music-bar ${barClass} music-bar-delay-2`} />
    </span>
  )
}
