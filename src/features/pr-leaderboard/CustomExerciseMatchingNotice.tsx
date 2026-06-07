import { Card } from '@/components/Card'
import { InfoIcon } from '@/components/InfoIcon'

function DetailsChevron() {
  return (
    <svg
      className="ml-auto h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CustomExerciseMatchingNotice() {
  return (
    <Card padding="sm" className="border-accent/20 bg-accent/5">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
          <InfoIcon />
          <span>How exercises are matched with friends</span>
          <DetailsChevron />
        </summary>
        <p className="mt-3 text-sm text-text-secondary leading-relaxed">
          Built-in exercises are matched by name (case-insensitive). Custom exercises are matched
          the same way, but a friend&apos;s custom exercise only appears if you also have a custom
          exercise with that name in your library.
        </p>
      </details>
    </Card>
  )
}
