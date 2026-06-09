import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { InstallSteps } from '@/components/InstallSteps'
import { Modal } from '@/components/Modal'
import {
  dismissInstallBanner,
  dismissInstallTip,
  isInstallBannerDismissed,
  isInstallTipDismissed,
} from '@/lib/installPrefs'
import { useInstall } from '@/hooks/useInstall'

export function InstallBanner() {
  const install = useInstall()
  const [bannerDismissed, setBannerDismissed] = useState(true)
  const [tipOpen, setTipOpen] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    const dismissed = isInstallBannerDismissed()
    setBannerDismissed(dismissed)
    if (dismissed && !isInstallTipDismissed()) {
      setTipOpen(true)
    }
  }, [])

  if (install.installed) return null

  const handleDismissBanner = () => {
    dismissInstallBanner()
    setBannerDismissed(true)
    setTipOpen(true)
  }

  const handleDismissTip = () => {
    dismissInstallTip()
    setTipOpen(false)
  }

  const handlePrimary = () => {
    if (install.canPrompt) {
      void install.promptInstall()
    } else {
      setShowGuide(true)
    }
  }

  const showBanner = !bannerDismissed

  if (!showBanner && !tipOpen && !showGuide) return null

  return (
    <>
      {showBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-3.5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="6" y="2" width="12" height="20" rx="3" />
              <path d="M11 18h2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Use Lift like an app</p>
            <p className="text-xs text-text-secondary">Add it to your home screen for full-screen, offline access.</p>
          </div>
          <button
            onClick={handlePrimary}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {install.canPrompt ? 'Install' : 'How?'}
          </button>
          <button
            onClick={handleDismissBanner}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {tipOpen && (
        <Modal title="Looking for this later?" onClose={handleDismissTip} showCloseButton>
          <p className="text-sm text-text-secondary">
            You can find install instructions anytime in{' '}
            <Link to="/profile/settings" className="font-medium text-accent" onClick={handleDismissTip}>
              Settings
            </Link>{' '}
            under <span className="font-medium text-text">Help → Install app</span>.
          </p>
        </Modal>
      )}

      {showGuide && (
        <Modal title="Install Lift" onClose={() => setShowGuide(false)} showCloseButton>
          <InstallSteps install={install} />
        </Modal>
      )}
    </>
  )
}
