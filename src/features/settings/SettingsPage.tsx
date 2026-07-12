import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ACCENT_PRESETS, DEFAULT_ACCENT } from '@/lib/theme'
import { BackButton } from '@/components/BackButton'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Switch } from '@/components/Switch'
import { DisplayNameInput } from '@/components/DisplayNameInput'
import { Input } from '@/components/Input'
import { eraseAllWorkoutData, fetchProfile, isDisplayNameTaken, updateProfileSettings } from '@/features/settings/profileApi'
import { FeedbackSection } from '@/features/settings/FeedbackSection'
import { InstallGuide } from '@/features/settings/InstallGuide'
import { PushNotificationsSheet } from '@/features/settings/PushNotificationsSheet'
import { capitalize } from '@/lib/format'
import { sectionHeadingBase, useSectionHeadingClass } from '@/lib/ui'
import type { Profile, ThemeMode, WeightUnit } from '@/lib/types'

const selectClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base'

function isPresetAccent(color: string) {
  return ACCENT_PRESETS.some((p) => p.color.toLowerCase() === color.toLowerCase())
}

function accentLabel(color: string) {
  return ACCENT_PRESETS.find((p) => p.color.toLowerCase() === color.toLowerCase())?.label ?? 'Custom'
}

function normalizeHexForColorInput(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(normalized)) return DEFAULT_ACCENT
  return `#${normalized.toLowerCase()}`
}

function DetailsChevron() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SettingsPage() {
  const { user, signOut, verifyPassword, changePassword } = useAuth()
  const { displayName, unit, loading: profileLoading, setDisplayName, setUnit } = useProfile()
  const { theme, accentColor, colorPop, loading, setTheme, setAccentColor, setColorPop } = useTheme()
  const sectionHeadingClassName = useSectionHeadingClass()
  const [saving, setSaving] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [displayNamePassword, setDisplayNamePassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [erasePassword, setErasePassword] = useState('')
  const [erasing, setErasing] = useState(false)
  const [eraseError, setEraseError] = useState<string | null>(null)
  const [eraseSuccess, setEraseSuccess] = useState(false)
  const [accentMode, setAccentMode] = useState<'preset' | 'custom'>('preset')
  const [hideExerciseDataFromFriends, setHideExerciseDataFromFriends] = useState(false)
  const [privacyLoading, setPrivacyLoading] = useState(true)
  const [pushProfile, setPushProfile] = useState<Profile | null>(null)
  const [pushSheetOpen, setPushSheetOpen] = useState(false)

  useEffect(() => {
    setNameDraft(displayName)
  }, [displayName])

  useEffect(() => {
    if (loading) return
    setAccentMode(isPresetAccent(accentColor) ? 'preset' : 'custom')
  }, [loading])

  useEffect(() => {
    if (!user) {
      setHideExerciseDataFromFriends(false)
      setPushProfile(null)
      setPrivacyLoading(false)
      return
    }

    setPrivacyLoading(true)
    fetchProfile(user.id)
      .then((profile) => {
        setHideExerciseDataFromFriends(Boolean(profile?.hide_exercise_data_from_friends))
        setPushProfile(profile)
      })
      .catch(() => {
        setHideExerciseDataFromFriends(false)
        setPushProfile(null)
      })
      .finally(() => setPrivacyLoading(false))
  }, [user?.id])

  const handleTheme = async (next: ThemeMode) => {
    setSaving(true)
    try {
      await setTheme(next)
    } finally {
      setSaving(false)
    }
  }

  const handleAccent = async (color: string) => {
    setSaving(true)
    try {
      await setAccentColor(color)
    } finally {
      setSaving(false)
    }
  }

  const handleColorPop = async (enabled: boolean) => {
    setSaving(true)
    try {
      await setColorPop(enabled)
    } finally {
      setSaving(false)
    }
  }

  const handleHideExerciseDataFromFriends = async (enabled: boolean) => {
    if (!user) return
    setSaving(true)
    setHideExerciseDataFromFriends(enabled)
    try {
      await updateProfileSettings(user.id, { hide_exercise_data_from_friends: enabled })
    } catch {
      setHideExerciseDataFromFriends(!enabled)
    } finally {
      setSaving(false)
    }
  }

  const accentSelectValue =
    accentMode === 'custom'
      ? 'custom'
      : (ACCENT_PRESETS.find((p) => p.color.toLowerCase() === accentColor.toLowerCase())?.color ??
        'custom')

  const handleSaveDisplayName = async () => {
    setNameSaving(true)
    setNameError(null)
    setNameSuccess(false)
    try {
      if (!user) {
        setNameError('Please sign in to update your username.')
        return
      }

      const nextName = nameDraft.trim()
      if (!displayNamePassword) {
        setNameError('Enter your password to confirm.')
        return
      }

      const { error: authError } = await verifyPassword(displayNamePassword)
      if (authError) {
        setNameError('Incorrect password.')
        return
      }

      if (nextName && (await isDisplayNameTaken(nextName, user.id))) {
        setNameError('That username is already taken.')
        return
      }

      await setDisplayName(nextName)
      setDisplayNamePassword('')
      setNameSuccess(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save username'
      const lowered = msg.toLowerCase()
      if (lowered.includes('duplicate') || lowered.includes('unique')) {
        setNameError('That username is already taken.')
        return
      }
      setNameError(msg)
    } finally {
      setNameSaving(false)
    }
  }

  const handleUnit = async (next: WeightUnit) => {
    setSaving(true)
    try {
      await setUnit(next)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordChanging(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      const { error } = await changePassword(currentPassword, newPassword)
      if (error) {
        setPasswordError(error.message)
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
    } finally {
      setPasswordChanging(false)
    }
  }

  const handleEraseWorkoutData = async () => {
    if (!user) return
    setErasing(true)
    setEraseError(null)
    setEraseSuccess(false)
    try {
      const { error: authError } = await verifyPassword(erasePassword)
      if (authError) {
        setEraseError('Incorrect password')
        return
      }
      await eraseAllWorkoutData(user.id)
      setErasePassword('')
      setEraseSuccess(true)
    } catch (err) {
      setEraseError(err instanceof Error ? err.message : 'Failed to erase workout data')
    } finally {
      setErasing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-3">
      <div className="flex items-center gap-3">
        <BackButton to="/profile" label="Back to profile" />
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className={sectionHeadingClassName}>Account</h2>

        {user && (
          <Card padding="sm" className="p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">Signed in as</p>
                <p className="text-xs text-text-secondary truncate">{user.email}</p>
              </div>
              <Button variant="danger" size="sm" className="shrink-0" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </Card>
        )}

        <Card padding="sm" className="p-0 overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">Username</p>
                <p className="text-xs text-text-secondary truncate">
                  {displayName ? `@${displayName}` : 'Not set'}
                </p>
              </div>
              <DetailsChevron />
            </summary>

            <div className="color-pop-muted-content flex flex-col gap-4 border-t border-border px-3.5 py-3.5">
              <DisplayNameInput
                label="Change username"
                autoComplete="name"
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value.replace(/^@+/, ''))
                  setNameError(null)
                  setNameSuccess(false)
                }}
                disabled={!user || profileLoading || nameSaving}
              />
              <Input
                label="Password to confirm"
                type="password"
                autoComplete="current-password"
                value={displayNamePassword}
                onChange={(e) => {
                  setDisplayNamePassword(e.target.value)
                  setNameError(null)
                  setNameSuccess(false)
                }}
                disabled={!user || profileLoading || nameSaving}
              />
              <Button
                fullWidth
                disabled={
                  !user ||
                  profileLoading ||
                  nameSaving ||
                  !displayNamePassword ||
                  nameDraft.trim() === displayName
                }
                onClick={handleSaveDisplayName}
              >
                {nameSaving ? 'Saving…' : 'Save username'}
              </Button>
              {nameError && <p className="text-sm text-danger text-center">{nameError}</p>}
              {nameSuccess && (
                <p className="text-sm text-text text-center">Username saved.</p>
              )}
            </div>
          </details>
        </Card>

        {user && (
          <Card padding="sm" className="p-0 overflow-hidden">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-xs text-text-secondary">Change your sign-in password</p>
                </div>
                <DetailsChevron />
              </summary>

              <div className="color-pop-muted-content flex flex-col gap-4 border-t border-border px-3.5 py-3.5">
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setPasswordError(null)
                    setPasswordSuccess(false)
                  }}
                  disabled={passwordChanging}
                />
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setPasswordError(null)
                    setPasswordSuccess(false)
                  }}
                  disabled={passwordChanging}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setPasswordError(null)
                    setPasswordSuccess(false)
                  }}
                  disabled={passwordChanging}
                />
                <Button
                  fullWidth
                  disabled={
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    passwordChanging
                  }
                  onClick={handleChangePassword}
                >
                  {passwordChanging ? 'Updating…' : 'Change password'}
                </Button>
                {passwordError && <p className="text-sm text-danger text-center">{passwordError}</p>}
                {passwordSuccess && (
                  <p className="text-sm text-text text-center">Password updated.</p>
                )}
              </div>
            </details>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={sectionHeadingClassName}>Preferences</h2>

        <Card padding="sm" className="p-0 overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">Appearance</p>
                <p className="text-xs text-text-secondary truncate">
                  {capitalize(theme)} · {accentLabel(accentColor)}
                  {colorPop ? ' · Color Pop' : ''}
                </p>
              </div>
              <DetailsChevron />
            </summary>

            <div className="flex flex-col gap-4 border-t border-border px-3.5 py-3.5">
              <div>
                <label className="text-sm font-medium" htmlFor="theme-select">
                  Theme
                </label>
                <select
                  id="theme-select"
                  className={selectClass}
                  value={theme}
                  disabled={loading || saving}
                  onChange={(e) => handleTheme(e.target.value as ThemeMode)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="accent-select">
                  Your color
                </label>
                <select
                  id="accent-select"
                  className={selectClass}
                  value={accentSelectValue}
                  disabled={loading || saving}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setAccentMode('custom')
                      return
                    }
                    setAccentMode('preset')
                    handleAccent(e.target.value)
                  }}
                >
                  {ACCENT_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.color}>
                      {preset.label}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
              </div>

              {accentSelectValue === 'custom' && (
                <div>
                  <label className="text-sm font-medium" htmlFor="custom-accent">
                    Custom color
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="custom-accent"
                      type="color"
                      value={normalizeHexForColorInput(accentColor)}
                      disabled={loading}
                      onChange={(e) => void setAccentColor(e.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                    />
                    <span className="text-sm text-text-secondary font-mono">{accentColor}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Color Pop</p>
                  <div className="mt-0.5 space-y-0 leading-snug">
                    <p className="text-xs text-text-secondary">
                      Add more of your chosen color to Lift
                    </p>
                    <p className="text-xs text-text-secondary">
                      (Note: Color Pop mode may reduce readability in some cases)
                    </p>
                  </div>
                </div>
                <Switch
                  label="Color Pop"
                  checked={colorPop}
                  disabled={loading || saving}
                  onChange={handleColorPop}
                />
              </div>
            </div>
          </details>
        </Card>

        <Card padding="sm" className="p-0 overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">Weight units</p>
                <p className="text-xs text-text-secondary truncate">
                  {unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}
                </p>
              </div>
              <DetailsChevron />
            </summary>

            <div className="flex flex-col gap-4 border-t border-border px-3.5 py-3.5">
              <div>
                <label className="text-sm font-medium" htmlFor="unit-select">
                  Units
                </label>
                <select
                  id="unit-select"
                  className={selectClass}
                  value={unit}
                  disabled={profileLoading || saving}
                  onChange={(e) => handleUnit(e.target.value as WeightUnit)}
                >
                  <option value="lb">Pounds (lb)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
                <p className="mt-2 text-xs text-text-secondary">
                  Weights are stored consistently; this changes how they are shown when logging and in stats.
                </p>
              </div>
            </div>
          </details>
        </Card>

        <Card padding="sm" className="p-0 overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">PR sharing with friends</p>
                <p className="text-xs text-text-secondary truncate">
                  {hideExerciseDataFromFriends ? 'Not currently sharing' : 'Currently sharing'}
                </p>
              </div>
              <DetailsChevron />
            </summary>

            <div className="flex flex-col gap-4 border-t border-border px-3.5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Hide PR data from friends</p>
                  <p className="mt-0.5 text-xs text-text-secondary leading-snug">
                    When on, friends won&apos;t see you on the PR leaderboard or in exercise
                    ranking comparisons. You can still view your own PRs and friends who share.
                  </p>
                </div>
                <Switch
                  label="Hide PR data from friends"
                  checked={hideExerciseDataFromFriends}
                  disabled={privacyLoading || saving}
                  onChange={handleHideExerciseDataFromFriends}
                />
              </div>
            </div>
          </details>
        </Card>

        {user && (
          <Card padding="sm" className="p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">Push notifications</p>
                <p className="text-xs text-text-secondary truncate">Alerts for this device</p>
              </div>
              <Button size="sm" className="shrink-0" onClick={() => setPushSheetOpen(true)}>
                Edit
              </Button>
            </div>
          </Card>
        )}
      </section>

      {user && pushSheetOpen && (
        <PushNotificationsSheet
          userId={user.id}
          profile={pushProfile}
          onClose={() => setPushSheetOpen(false)}
          onProfileChange={(next) =>
            setPushProfile((prev) => (prev ? { ...prev, ...next } : prev))
          }
        />
      )}

      <section className="flex flex-col gap-2">
        <h2 className={sectionHeadingClassName}>Help</h2>
        <FeedbackSection />
        <InstallGuide />
      </section>

      {user && (
        <section className="flex flex-col gap-2">
          <h2 className={`${sectionHeadingBase} text-danger`}>Danger</h2>

          <Card padding="sm" className="p-0 overflow-hidden border-danger/30">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-danger">Erase workout history</p>
                  <p className="text-xs text-text-secondary">Permanently delete all logged workouts</p>
                </div>
                <DetailsChevron />
              </summary>

              <div className="flex flex-col gap-4 border-t border-border px-3.5 py-3.5">
                <p className="text-sm text-text-secondary">
                  This permanently deletes all workout history — every logged set, rep, weight, cardio
                  entry, session note, and in-progress workout. This cannot be undone.
                </p>

                <div className="text-sm">
                  <p className="font-medium mb-1">What is kept</p>
                  <ul className="list-disc pl-5 text-text-secondary space-y-0.5">
                    <li>Your account, email, and password</li>
                    <li>Profile, appearance, and unit settings</li>
                    <li>Custom exercises</li>
                    <li>Workout templates</li>
                  </ul>
                </div>

                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={erasePassword}
                  onChange={(e) => {
                    setErasePassword(e.target.value)
                    setEraseError(null)
                    setEraseSuccess(false)
                  }}
                  disabled={erasing}
                />

                <Button
                  variant="danger"
                  fullWidth
                  disabled={!erasePassword || erasing}
                  onClick={handleEraseWorkoutData}
                >
                  {erasing ? 'Erasing…' : 'Erase all workout data'}
                </Button>

                {eraseError && <p className="text-sm text-danger text-center">{eraseError}</p>}
                {eraseSuccess && (
                  <p className="text-sm text-text text-center">All workout data has been erased.</p>
                )}
              </div>
            </details>
          </Card>
        </section>
      )}

    </div>
  )
}
