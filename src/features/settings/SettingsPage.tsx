import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ACCENT_PRESETS } from '@/lib/theme'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import type { ThemeMode } from '@/lib/types'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { theme, accentColor, loading, setTheme, setAccentColor } = useTheme()
  const [saving, setSaving] = useState(false)

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {user && (
        <Card padding="sm">
          <p className="text-xs text-text-secondary">Signed in as</p>
          <p className="font-medium truncate">{user.email}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Appearance</h2>

        <p className="text-sm font-medium mb-2">Theme</p>
        <div className="flex rounded-xl bg-surface-secondary p-1 mb-4">
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => handleTheme('light')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              theme === 'light' ? 'bg-surface shadow-sm' : 'text-text-secondary'
            }`}
          >
            Light
          </button>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => handleTheme('dark')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              theme === 'dark' ? 'bg-surface shadow-sm' : 'text-text-secondary'
            }`}
          >
            Dark
          </button>
        </div>

        <p className="text-sm font-medium mb-2">Accent color</p>
        <div className="grid grid-cols-3 gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={loading || saving}
              onClick={() => handleAccent(preset.color)}
              className={[
                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-colors',
                accentColor.toLowerCase() === preset.color.toLowerCase()
                  ? 'border-accent bg-surface-secondary'
                  : 'border-transparent hover:bg-surface-secondary',
              ].join(' ')}
            >
              <span
                className="h-8 w-8 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: preset.color }}
              />
              <span className="text-xs font-medium">{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium" htmlFor="custom-accent">
            Custom color
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="custom-accent"
              type="color"
              value={accentColor}
              disabled={loading || saving}
              onChange={(e) => handleAccent(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
            />
            <span className="text-sm text-text-secondary font-mono">{accentColor}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-text-secondary">
          Saved to your account and syncs across devices.
        </p>
      </Card>

      <Button variant="danger" fullWidth onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  )
}
