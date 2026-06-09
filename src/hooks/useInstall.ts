import { useCallback, useEffect, useState } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'ios-safari' | 'ios-other' | 'android' | 'desktop'

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const isIos = /iphone|ipad|ipod/i.test(ua) || isIpadOS
  if (isIos) {
    // On iOS every browser is WebKit, but only Safari can add to the home screen.
    const isOtherBrowser = /crios|fxios|edgios|opt\//i.test(ua)
    return isOtherBrowser ? 'ios-other' : 'ios-safari'
  }
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

export interface InstallState {
  platform: InstallPlatform
  installed: boolean
  /** True when the browser supports a native one-tap install prompt. */
  canPrompt: boolean
  /** Triggers the native install prompt. Resolves to whether it was accepted. */
  promptInstall: () => Promise<boolean>
}

export function useInstall(): InstallState {
  const [platform, setPlatform] = useState<InstallPlatform>('desktop')
  const [installed, setInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setPlatform(detectPlatform())
    setInstalled(isStandalone())

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    return outcome === 'accepted'
  }, [deferredPrompt])

  return { platform, installed, canPrompt: deferredPrompt !== null, promptInstall }
}
