import { Card } from '@/components/Card'
import { InstallSteps } from '@/components/InstallSteps'
import { useInstall } from '@/hooks/useInstall'

function DetailsChevron() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180"
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

export function InstallGuide() {
  const install = useInstall()
  const summary = install.installed ? 'Lift is installed' : 'Add Lift to your home screen'

  return (
    <Card padding="sm" className="p-0 overflow-hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">Install app</p>
            <p className="text-xs text-text-secondary truncate">{summary}</p>
          </div>
          <DetailsChevron />
        </summary>

        <div className="border-t border-border px-3.5 py-3.5">
          <InstallSteps install={install} />
        </div>
      </details>
    </Card>
  )
}
