import { useState, type ReactNode } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { CollapseIcon } from '@/components/CollapseIcon'
import { ExpandIcon } from '@/components/ExpandIcon'
import { ReuseIcon } from '@/components/ReuseIcon'
import { SwapIcon } from '@/components/SwapIcon'
import { updateProfileSettings } from '@/features/settings/profileApi'
import {
  UPDATES_POPUP,
  UPDATES_POPUP_VERSION,
  type UpdateItem,
  type UpdateItemIcon,
} from '@/features/dashboard/updatesContent'

function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
    </svg>
  )
}

function PrivacyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LeaderboardIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
      aria-hidden
    >
      <path d="M8 21h8" strokeLinecap="round" />
      <path d="M12 17v4" strokeLinecap="round" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h3" strokeLinecap="round" />
      <path d="M17 9h3" strokeLinecap="round" />
    </svg>
  )
}

function LibraryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UpdateItemGlyph({ icon, size = 'md' }: { icon: UpdateItemIcon; size?: 'md' | 'sm' }) {
  const px = size === 'md' ? 20 : 16

  const glyph: ReactNode = (() => {
    switch (icon) {
      case 'push':
        return <BellIcon size={px} />
      case 'collapse':
        return (
          <span className="flex items-center gap-0.5" aria-hidden>
            <CollapseIcon size={px - 2} />
            <ExpandIcon size={px - 2} />
          </span>
        )
      case 'swap':
        return <SwapIcon size={px} />
      case 'reuse':
        return <ReuseIcon size={px} />
      case 'privacy':
        return <PrivacyIcon size={px} />
      case 'leaderboard':
        return <LeaderboardIcon size={px} />
      case 'library':
        return <LibraryIcon size={px} />
    }
  })()

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

function MainUpdateItem({ title, description, icon }: UpdateItem) {
  return (
    <li className="relative overflow-hidden rounded-xl border border-border bg-surface-secondary/60 px-3.5 py-3">
      <div className="flex gap-3">
        <UpdateItemGlyph icon={icon} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-text">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
        </div>
      </div>
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
