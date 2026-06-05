type LoadingSpinnerProps = {
  /** 'screen' = full viewport; 'page' = below nav; 'section' = tab/section content */
  size?: 'screen' | 'page' | 'section'
}

const sizeClasses = {
  screen: 'min-h-dvh',
  page: 'min-h-[calc(100dvh-7rem)]',
  section: 'min-h-[40vh]',
} as const

export function LoadingSpinner({ size = 'page' }: LoadingSpinnerProps) {
  return (
    <div
      className={`flex items-center justify-center ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  )
}
