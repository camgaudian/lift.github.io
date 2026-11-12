import { useState, type ReactNode } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { LiftMonogram } from '@/components/LiftMark'
import { updateProfileSettings } from '@/features/settings/profileApi'
import {
  UPDATES_POPUP,
  UPDATES_POPUP_VERSION,
  type UpdateItem,
  type UpdateItemIcon,
} from '@/features/dashboard/updatesContent'

/** Stroke paths (24×24 viewBox) for each update glyph. */
const GLYPH_PATHS: Record<Exclude<UpdateItemIcon, 'brand'>, ReactNode> = {
  // Snowflake
  holiday: (
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M9.5 3.8L12 6.3l2.5-2.5M9.5 20.2L12 17.7l2.5 2.5" />
  ),
  // Track with a thumb and arrows
  slide: (
    <>
      <rect x="2" y="7" width="20" height="10" rx="5" />
      <circle cx="7" cy="12" r="2.5" />
      <path d="M13 10l2 2-2 2M17 10l2 2-2 2" />
    </>
  ),
  // Circular refresh arrow
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </>
  ),
  // Stacked cards
  templates: (
    <>
      <rect x="7" y="3" width="13" height="15" rx="2" />
      <path d="M4 7v11a3 3 0 0 0 3 3h9" />
    </>
  ),
  // Medal
  milestone: (
    <>
      <path d="M8 2l2 6M16 2l-2 6" />
      <circle cx="12" cy="14" r="6" />
      <path d="M12 11.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
    </>
  ),
  // Trash can
  delete: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
    </>
  ),
  // Sparkle
  polish: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15v4M17 17h4" />
    </>
  ),
}

function UpdateItemGlyph({ icon, size = 'md' }: { icon: UpdateItemIcon; size?: 'md' | 'sm' }) {
  const px = size === 'md' ? 20 : 16

  const glyph =
    icon === 'brand' ? (
      <LiftMonogram height={px} />
    ) : (
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden
      >
        {GLYPH_PATHS[icon]}
      </svg>
    )

  return (
    <span
      className={[
        'flex shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent',
        size === 'md' ? 'h-10 w-10' : 'h-8 w-8',
      ].join(' ')}
      aria-hidden
    >
      {glyph}
    </span>
  )
}

function InfoIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className="mt-0.5 shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v6M12 7.5v.01" />
    </svg>
  )
}

function MainUpdateItem({ title, description, icon, note }: UpdateItem) {
  return (
    <li className="relative overflow-hidden rounded-xl border border-border bg-surface-secondary/60 px-3.5 py-3">
      <div className="flex gap-3">
        <UpdateItemGlyph icon={icon} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-text">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
        </div>
      </div>
      {note && (
        <p className="mt-3 flex gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium leading-relaxed text-text">
          <span className="text-accent">
            <InfoIcon />
          </span>
          <span>{note}</span>
        </p>
      )}
    </li>
  )
}

function MoreUpdateItem({ title, description, icon }: UpdateItem) {
  return (
    <li className="rounded-xl border border-border/70 bg-surface-secondary/35 px-3.5 py-2.5">
      <div className="flex gap-2.5">
        <UpdateItemGlyph icon={icon} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-text">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{description}</p>
        </div>
      </div>
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
      await updateProfileSettings(userId, {
        last_seen_updates_version: UPDATES_POPUP_VERSION,
        show_updates_popup: false,
      })
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
