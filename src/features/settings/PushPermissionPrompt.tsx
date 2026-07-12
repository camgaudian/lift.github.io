import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { fetchProfile } from '@/features/settings/profileApi'
import {
  completePushPrompt,
  ensurePushSubscription,
  getNotificationPermission,
  isPushSupported,
  markPushDenyTipShown,
  requestNotificationPermission,
  shouldShowPushDenyTip,
} from '@/features/settings/pushApi'

/**
 * Soft-asks for notification permission once per account when the app opens.
 * OS deny turns all push prefs off and shows a one-time Settings tip.
 */
export function PushPermissionPrompt() {
  const { user } = useAuth()
  const [promptOpen, setPromptOpen] = useState(false)
  const [denyTipOpen, setDenyTipOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) {
      setPromptOpen(false)
      return
    }
    if (!isPushSupported()) return

    let cancelled = false

    void (async () => {
      try {
        const profile = await fetchProfile(user.id)
        if (cancelled || !profile || profile.push_prompt_completed) return

        const permission = getNotificationPermission()
        if (permission === 'granted') {
          await ensurePushSubscription(user.id)
          await completePushPrompt(user.id)
          return
        }
        if (permission === 'denied') {
          await completePushPrompt(user.id, { disableAllPrefs: true })
          if (shouldShowPushDenyTip()) setDenyTipOpen(true)
          return
        }
        // permission === 'default'
        setPromptOpen(true)
      } catch {
        // ignore — prompt can retry next visit
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const finishSoftPrompt = async (enable: boolean) => {
    if (!user || busy) return
    setBusy(true)
    try {
      if (!enable) {
        await completePushPrompt(user.id)
        setPromptOpen(false)
        return
      }

      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        await ensurePushSubscription(user.id)
        await completePushPrompt(user.id)
        setPromptOpen(false)
        return
      }

      await completePushPrompt(user.id, { disableAllPrefs: true })
      setPromptOpen(false)
      if (shouldShowPushDenyTip()) setDenyTipOpen(true)
    } catch {
      setPromptOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const dismissDenyTip = () => {
    markPushDenyTipShown()
    setDenyTipOpen(false)
  }

  return (
    <>
      {promptOpen && (
        <Modal
          title="Enable notifications?"
          onClose={() => void finishSoftPrompt(false)}
          footer={
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busy}
                onClick={() => void finishSoftPrompt(false)}
              >
                Not now
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void finishSoftPrompt(true)}>
                Enable
              </Button>
            </div>
          }
        >
          <p className="text-sm text-text-secondary">
            Get alerts for friend requests, shares, and long active workouts — even when Lift is
            closed.
          </p>
        </Modal>
      )}

      {denyTipOpen && (
        <Modal title="Notifications are off" onClose={dismissDenyTip} showCloseButton>
          <p className="text-sm text-text-secondary">
            You can turn them on anytime in{' '}
            <Link to="/profile/settings" className="font-medium text-accent" onClick={dismissDenyTip}>
              Settings
            </Link>{' '}
            under <span className="font-medium text-text">Push notifications</span>.
          </p>
        </Modal>
      )}
    </>
  )
}
