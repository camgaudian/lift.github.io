/** A single shimmering placeholder block. Compose these to mirror real layouts. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

/** Wraps a skeleton layout with the right loading semantics for assistive tech. */
export function SkeletonGroup({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className} role="status" aria-label="Loading" aria-busy="true">
      {children}
    </div>
  )
}
