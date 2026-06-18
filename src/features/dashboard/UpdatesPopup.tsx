import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { updateProfileSettings } from '@/features/settings/profileApi'
import { UPDATES_POPUP, type UpdateItem } from '@/features/dashboard/updatesContent'

function MainUpdateItem({ title, description }: UpdateItem) {
  return (
    <li className="relative overflow-hidden rounded-xl border border-border bg-surface-secondary/60 px-3.5 py-3 pl-4">
      <div
        className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-accent"
        aria-hidden
      />
      <p className="text-sm font-semibold leading-snug text-text">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
    </li>
  )
}

function MoreUpdateItem({ title, description }: UpdateItem) {
  return (
    <li className="rounded-xl border border-border/70 bg-surface-secondary/35 px-3.5 py-2.5">
      <p className="text-sm font-medium leading-snug text-text">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{description}</p>
    </li>
  )
}

function UpdateSection({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section>
      {title && (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </h3>
      )}
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  )
}

export function UpdatesPopup({
  userId,
  onDismissed,
}: {
  userId: string
  onDismissed: () => void
}) {
  const [dismissing, setDismissing] = useState(false)

  const handleDismiss = async () => {
    if (dismissing) return
    setDismissing(true)
    try {
      await updateProfileSettings(userId, { show_updates_popup: false })
      onDismissed()
    } catch {
      setDismissing(false)
    }
  }

  return (
    <Modal
      title={UPDATES_POPUP.title}
      onClose={() => !dismissing && void handleDismiss()}
      scrollable
      showCloseButton={false}
      bodyClassName="mt-3"
      footer={
        <div className="shrink-0 border-t border-border/80 pt-4">
          <Button
            fullWidth
            onClick={() => void handleDismiss()}
            disabled={dismissing}
          >
            {dismissing ? 'Saving…' : 'Got it!'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        <UpdateSection title={UPDATES_POPUP.mainSectionTitle}>
          {UPDATES_POPUP.main.map((item) => (
            <MainUpdateItem key={item.title} {...item} />
          ))}
        </UpdateSection>

        {UPDATES_POPUP.more.length > 0 && (
          <UpdateSection title={UPDATES_POPUP.moreSectionTitle}>
            {UPDATES_POPUP.more.map((item) => (
              <MoreUpdateItem key={item.title} {...item} />
            ))}
          </UpdateSection>
        )}
      </div>
    </Modal>
  )
}
