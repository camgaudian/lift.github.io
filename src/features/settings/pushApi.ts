import { supabase } from '@/lib/supabase'

export const PUSH_PREF_KEYS = [
  'push_friend_request',
  'push_exercise_share',
  'push_template_share',
  'push_workout_reminder',
] as const

export type PushPrefKey = (typeof PUSH_PREF_KEYS)[number]

export const PUSH_PREF_LABELS: Record<PushPrefKey, string> = {
  push_friend_request: 'Friend requests',
  push_exercise_share: 'Exercise shares',
  push_template_share: 'Template shares',
  push_workout_reminder: 'Unfinished workouts',
}

const DENY_TIP_KEY = 'lift.push.denyTipShown'

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!key || key.includes('YOUR_')) return null
  return key
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

async function savePushSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Incomplete push subscription')
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

/** Subscribe this device and persist the subscription. Returns false if unavailable. */
export async function ensurePushSubscription(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false

  const vapidKey = getVapidPublicKey()
  if (!vapidKey) {
    console.warn('VITE_VAPID_PUBLIC_KEY is not configured')
    return false
  }

  const registration = await getReadyRegistration()
  if (!registration) return false

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
  }

  await savePushSubscription(userId, subscription)
  return true
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Mark soft prompt done; optionally turn all push prefs off (OS deny). */
export async function completePushPrompt(
  userId: string,
  options?: { disableAllPrefs?: boolean },
): Promise<void> {
  const updates: Record<string, boolean> = {
    push_prompt_completed: true,
  }
  if (options?.disableAllPrefs) {
    for (const key of PUSH_PREF_KEYS) {
      updates[key] = false
    }
  }
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

export async function updatePushPref(
  userId: string,
  key: PushPrefKey,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ [key]: enabled })
    .eq('id', userId)
  if (error) throw error
}

export function shouldShowPushDenyTip(): boolean {
  try {
    return localStorage.getItem(DENY_TIP_KEY) !== '1'
  } catch {
    return true
  }
}

export function markPushDenyTipShown(): void {
  try {
    localStorage.setItem(DENY_TIP_KEY, '1')
  } catch {
    // ignore
  }
}

/**
 * Enable a push preference: request OS permission if needed, subscribe, then save pref.
 * Returns the resulting enabled state (false if permission denied).
 */
export async function enablePushPref(userId: string, key: PushPrefKey): Promise<boolean> {
  if (!isPushSupported()) {
    await updatePushPref(userId, key, false)
    return false
  }

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await requestNotificationPermission()
  }

  if (permission !== 'granted') {
    await updatePushPref(userId, key, false)
    return false
  }

  await ensurePushSubscription(userId)
  await updatePushPref(userId, key, true)
  return true
}
