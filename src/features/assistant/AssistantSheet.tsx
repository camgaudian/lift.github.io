import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { Button } from '@/components/Button'
import { InfoPopover } from '@/components/InfoPopover'
import { useTheme } from '@/contexts/ThemeContext'
import { AssistantMessage } from './AssistantMessage'
import {
  getAssistantIncludeDataPref,
  setAssistantIncludeDataPref,
} from './assistantPrefs'
import { useAssistantChat } from './useAssistantChat'
import type { WorkoutContextPayload } from './assistantApi'

function InvertedBadge({ label, size = 'md' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center rounded font-bold leading-none',
        size === 'sm' ? 'px-0.5 py-px text-[10px]' : 'px-1 py-px text-xs -ml-1',
      ].join(' ')}
      style={{ backgroundColor: 'currentColor' }}
    >
      <span className="text-surface">{label}</span>
    </span>
  )
}

function NiftySubline() {
  return (
    <div className="flex items-center gap-1.5 text-base text-text-secondary leading-none">
      <span>Lift</span>
      <InvertedBadge label="AI" size="sm" />
    </div>
  )
}

const SUGGESTIONS = [
  'How do I bench press?',
  "What's my bench PR?",
  'Summarize my last 3 workouts',
]

interface AssistantSheetProps {
  onClose: () => void
  workoutContext?: WorkoutContextPayload
}

export function AssistantSheet({ onClose, workoutContext }: AssistantSheetProps) {
  const { accentColor } = useTheme()
  const [includeUserData, setIncludeUserData] = useState(getAssistantIncludeDataPref)
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const { messages, streaming, error, send, cancel, reset, setError } =
    useAssistantChat(workoutContext)

  useEffect(() => {
    return () => reset()
  }, [reset])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const handleIncludeDataChange = (checked: boolean) => {
    setIncludeUserData(checked)
    setAssistantIncludeDataPref(checked)
  }

  const handleSend = () => {
    if (!draft.trim()) return
    const text = draft
    setDraft('')
    void send(text, includeUserData)
  }

  const handleSuggestion = (text: string) => {
    void send(text, includeUserData)
  }

  return (
    <BottomSheet
      title="Nifty"
      titleSuffix={<InvertedBadge label="Beta" />}
      titleSubline={<NiftySubline />}
      onClose={onClose}
      scrollable
      fullHeight
      bodyClassName="mt-3 flex min-h-0 flex-1 flex-col pb-2"
      accentColor={accentColor}
      headerAction={
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-text-secondary"
        >
          Done
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div
          ref={listRef}
          className="min-h-[200px] flex-1 space-y-3 overflow-y-auto overscroll-contain py-1"
        >
          {messages.length === 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-text-secondary">
                Ask about exercise form or your training. Enable workout data for personal stats
                and history.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={streaming}
                    onClick={() => handleSuggestion(s)}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-text disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <AssistantMessage key={i} message={msg} />
          ))}

          {streaming && messages[messages.length - 1]?.content === '' && (
            <p className="text-xs text-text-secondary">Thinking…</p>
          )}
        </div>

        {error && (
          <p className="text-center text-sm text-danger" role="alert">
            {error}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </p>
        )}

        <div className="shrink-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={includeUserData}
              aria-label="Include my data"
              disabled={streaming}
              onClick={() => handleIncludeDataChange(!includeUserData)}
              className={[
                'flex w-fit items-center gap-1.5 rounded-full border pl-2 pr-1.5 py-1 text-[11px] font-medium',
                'transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
                includeUserData
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border/50 bg-surface-secondary text-text-secondary',
              ].join(' ')}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
              </svg>
              Include my data
              <span aria-hidden className="inline-flex h-7 w-[26px] shrink-0 items-center">
                <span
                  className={[
                    'relative inline-flex h-4 w-[26px] items-center rounded-full transition-colors',
                    includeUserData ? 'bg-accent' : 'bg-border',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                      includeUserData ? 'translate-x-[13px]' : 'translate-x-px',
                    ].join(' ')}
                  />
                </span>
              </span>
            </button>

            <InfoPopover ariaLabel="About including workout data" title="Include my data" size="sm">
              <p className="text-sm text-text-secondary leading-relaxed">
                When enabled, Nifty can look up your logged workouts, personal records, and training
                history to answer questions like &ldquo;What&apos;s my bench PR?&rdquo; or
                &ldquo;Summarize my last few sessions.&rdquo;
              </p>
              <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                When disabled, Nifty only uses general exercise guidance and form articles.{' '}
                <strong className="font-semibold text-text">
                  Your workout data is never sent unless this is turned on for that message.
                </strong>
              </p>
            </InfoPopover>
          </div>

          <div
            className={[
              'flex gap-2 rounded-xl border bg-surface p-2 transition-[border-color,box-shadow]',
              'border-border focus-within:border-accent focus-within:shadow-[0_0_14px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]',
            ].join(' ')}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask a question…"
              disabled={streaming}
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-text-secondary disabled:opacity-50"
            />
            {streaming ? (
              <Button variant="secondary" onClick={cancel}>
                Stop
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!draft.trim()}>
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
