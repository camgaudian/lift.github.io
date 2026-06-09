const BANNER_DISMISS_KEY = 'lift:install-banner-dismissed'
const TIP_DISMISS_KEY = 'lift:install-banner-tip-dismissed'
const LEGACY_BANNER_DISMISS_KEY = 'lift:install-banner-dismissed-at'

function migrateLegacyBannerDismiss() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(BANNER_DISMISS_KEY)) return
  if (!localStorage.getItem(LEGACY_BANNER_DISMISS_KEY)) return
  localStorage.setItem(BANNER_DISMISS_KEY, '1')
  localStorage.removeItem(LEGACY_BANNER_DISMISS_KEY)
}

export function isInstallBannerDismissed() {
  migrateLegacyBannerDismiss()
  return typeof localStorage !== 'undefined' && localStorage.getItem(BANNER_DISMISS_KEY) === '1'
}

export function dismissInstallBanner() {
  localStorage.setItem(BANNER_DISMISS_KEY, '1')
}

export function isInstallTipDismissed() {
  return typeof localStorage !== 'undefined' && localStorage.getItem(TIP_DISMISS_KEY) === '1'
}

export function dismissInstallTip() {
  localStorage.setItem(TIP_DISMISS_KEY, '1')
}
