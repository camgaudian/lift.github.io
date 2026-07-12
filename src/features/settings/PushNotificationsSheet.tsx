import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { Switch } from '@/components/Switch'
import {
  PUSH_PREF_KEYS,
  PUSH_PREF_LABELS,
  enablePushPref,
  isPushSupported,
  type PushPrefKey,
  updatePushPref,
} from '@/features/settings/pushApi'
import type { Profile } from '@/lib/types'

function prefValue(profile: Profile | null, key: PushPrefKey): boolean {
  if (!profile) return true
  const value = profile[key]
  return value !== false
}

export function PushNotificationsSheet({
  userId,
  profile,
  onClose,
  onProfileChange,
}: {
  userId: string
  profile: Profile | null
  onClose: () => void
  onProfileChange: (next: Partial<Profile>) => void
}) {
  const [prefs, setPrefs] = useState<Record<PushPrefKey, boolean>>(() => {
    const initial = {} as Record<PushPrefKey, boolean>
    for (const key of PUSH_PREF_KEYS) {
      initial[key] = prefValue(profile, key)
    }
    return initial
  })
  const [pendingKey, setPendingKey] = useState<PushPrefKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supported = isPushSupported()

  useEffect(() => {
    const next = {} as Record<PushPrefKey, boolean>
    for (const key of PUSH_PREF_KEYS) {
      next[key] = prefValue(profile, key)
    }
    setPrefs(next)
  }, [profile])

  const handleToggle = async (key: PushPrefKey, enabled: boolean) => {
    setError(null)
    const previous = prefs[key]
    setPrefs((p) => ({ ...p, [key]: enabled }))
    setPendingKey(key)

    try {
      if (enabled) {
        const ok = await enablePushPref(userId, key)
        if (!ok) {
          setPrefs((p) => ({ ...p, [key]: false }))
          onProfileChange({ [key]: false })
          setError(
            supported
              ? 'Notification permission is required. Enable it in your browser or device settings.'
              : 'Push notifications are not supported in this browser.',
          )
          return
        }
        onProfileChange({ [key]: true })
      } else {
        await updatePushPref(userId, key, false)
        onProfileChange({ [key]: false })
      }
    } catch {
      setPrefs((p) => ({ ...p, [key]: previous }))
      setError('Could not update notification settings. Try again.')
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <BottomSheet title="Customize notifications" onClose={onClose} showCloseButton scrollable>
      <p className="text-sm text-text-secondary">
        Choose which alerts can appear on this device. In-app notifications in your profile are
        unchanged.
      </p>

      {!supported && (
        <p className="mt-3 text-sm text-danger">
          This browser does not support push notifications.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1">
        {PUSH_PREF_KEYS.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-xl px-1 py-2.5"
          >
            <p className="min-w-0 text-sm font-medium">{PUSH_PREF_LABELS[key]}</p>
            <Switch
              label={PUSH_PREF_LABELS[key]}
              checked={prefs[key]}
              disabled={pendingKey !== null}
              onChange={(checked) => void handleToggle(key, checked)}
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </BottomSheet>
  )
}
