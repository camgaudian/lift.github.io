import { Button } from '@/components/Button'
import type { InstallState } from '@/hooks/useInstall'

function ShareIcon() {
  return (
    <svg
      className="inline-block h-4 w-4 -translate-y-0.5 text-accent"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
        {n}
      </span>
      <span className="pt-0.5 text-sm text-text-secondary">{children}</span>
    </li>
  )
}

export function InstallSteps({ install }: { install: InstallState }) {
  const { platform, installed, canPrompt, promptInstall } = install

  if (installed) {
    return (
      <p className="text-sm text-text-secondary">
        You&apos;re all set! Lift is running as an installed app. Launch it from your home screen or app
        list any time, just like a native app.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Lift is a web app you can install to your home screen. Once installed it opens in its own window
        (full screen, no browser bars) and works offline like a normal app.
      </p>

      {canPrompt && (
        <Button fullWidth onClick={() => void promptInstall()}>
          Install Lift
        </Button>
      )}

      {platform === 'ios-safari' && (
        <ol className="flex flex-col gap-2.5">
          <Step n={1}>
            Tap the <ShareIcon /> <span className="font-medium text-text">Share</span> button in
            Safari&apos;s toolbar.
          </Step>
          <Step n={2}>
            Scroll down and tap <span className="font-medium text-text">Add to Home Screen</span>.
          </Step>
          <Step n={3}>
            Tap <span className="font-medium text-text">Add</span> in the top corner. Lift now lives on your
            home screen.
          </Step>
        </ol>
      )}

      {platform === 'ios-other' && (
        <>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            On iPhone and iPad, only <span className="font-medium">Safari</span> can add apps to the home
            screen. Open lift.gaudian.dev in Safari first, then follow these steps.
          </p>
          <ol className="flex flex-col gap-2.5">
            <Step n={1}>
              In Safari, tap the <ShareIcon /> <span className="font-medium text-text">Share</span> button.
            </Step>
            <Step n={2}>
              Tap <span className="font-medium text-text">Add to Home Screen</span>.
            </Step>
            <Step n={3}>
              Tap <span className="font-medium text-text">Add</span> to finish.
            </Step>
          </ol>
        </>
      )}

      {platform === 'android' && !canPrompt && (
        <ol className="flex flex-col gap-2.5">
          <Step n={1}>
            Tap the <span className="font-medium text-text">⋮</span> menu in your browser&apos;s toolbar.
          </Step>
          <Step n={2}>
            Tap <span className="font-medium text-text">Install app</span> or{' '}
            <span className="font-medium text-text">Add to Home screen</span>.
          </Step>
          <Step n={3}>Confirm. Lift will appear in your app drawer like any other app.</Step>
        </ol>
      )}

      {platform === 'desktop' && !canPrompt && (
        <ol className="flex flex-col gap-2.5">
          <Step n={1}>
            In Chrome or Edge, click the <span className="font-medium text-text">install icon</span> on the
            right side of the address bar (a monitor with a down arrow).
          </Step>
          <Step n={2}>
            Or open the browser menu and choose{' '}
            <span className="font-medium text-text">Install Lift</span>.
          </Step>
          <Step n={3}>Lift opens in its own window and is added to your apps.</Step>
        </ol>
      )}
    </div>
  )
}
