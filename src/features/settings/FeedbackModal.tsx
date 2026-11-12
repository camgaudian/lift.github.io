import { FormEvent, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { Button } from '@/components/Button'
import { BottomSheet } from '@/components/BottomSheet'
import { Select } from '@/components/Select'
import { Textarea } from '@/components/Textarea'
import { sendFeedback, type FeedbackCategory } from '@/features/settings/feedbackApi'

const MAX_MESSAGE_LENGTH = 1500

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const { displayName } = useProfile()
  const [category, setCategory] = useState<FeedbackCategory>('general')
  const [message, setMessage] = useState('')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const trimmed = message.trim()
  const canSubmit = trimmed.length >= 10 && trimmed.length <= MAX_MESSAGE_LENGTH && !sending

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSending(true)
    setError(null)
    try {
      await sendFeedback({
        category,
        message: trimmed,
        includeDiagnostics,
        userEmail: user?.email,
        displayName: displayName || undefined,
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <BottomSheet title="Thanks!" onClose={onClose}>
        <p className="text-sm text-text-secondary">
          Your feedback was sent. I really appreciate you taking the time to help improve Lift.
        </p>
        <Button fullWidth className="mt-5" onClick={onClose}>
          Done
        </Button>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet title="Send feedback" onClose={() => !sending && onClose()} scrollable>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Report a bug, suggest a feature, or share anything else on your mind.
        </p>

        <Select
          label="Category"
          value={category}
          disabled={sending}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
        >
          <option value="bug">Bug report</option>
          <option value="idea">Feature idea</option>
          <option value="general">General feedback</option>
        </Select>

        <div>
          <Textarea
            label="Message"
            className="min-h-[120px] resize-y"
            value={message}
            disabled={sending}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="What happened? What would you like to see? Be as specific as you can."
            onChange={(e) => {
              setMessage(e.target.value)
              setError(null)
            }}
          />
          <p className="mt-1 text-xs text-text-secondary text-right">
            {trimmed.length}/{MAX_MESSAGE_LENGTH}
            {trimmed.length > 0 && trimmed.length < 10 && ' · at least 10 characters'}
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={includeDiagnostics}
            disabled={sending}
            onChange={(e) => setIncludeDiagnostics(e.target.checked)}
          />
          <span className="text-text-secondary">
            Include device and page info to help debug issues
          </span>
        </label>

        {error && <p className="text-sm text-danger text-center">{error}</p>}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={sending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={!canSubmit}>
            {sending ? 'Sending…' : 'Send feedback'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
