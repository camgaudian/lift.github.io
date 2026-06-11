import { supabase } from '@/lib/supabase'

export type FeedbackCategory = 'bug' | 'idea' | 'general'

export interface FeedbackPayload {
  category: FeedbackCategory
  message: string
  includeDiagnostics: boolean
  userEmail?: string
  displayName?: string
}

const categoryLabels: Record<FeedbackCategory, string> = {
  bug: 'Bug report',
  idea: 'Feature idea',
  general: 'General feedback',
}

function buildDiscordBody(payload: FeedbackPayload) {
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: 'Category', value: categoryLabels[payload.category], inline: true },
  ]

  if (payload.displayName) {
    fields.push({ name: 'Username', value: `@${payload.displayName}`, inline: true })
  }
  if (payload.userEmail) {
    fields.push({ name: 'Email', value: payload.userEmail, inline: true })
  }

  fields.push({ name: 'Message', value: payload.message.slice(0, 1024) })

  if (payload.includeDiagnostics) {
    fields.push({
      name: 'Diagnostics',
      value: [
        `URL: ${window.location.href}`,
        `User agent: ${navigator.userAgent}`,
        `Screen: ${window.screen.width}×${window.screen.height}`,
        `Viewport: ${window.innerWidth}×${window.innerHeight}`,
      ].join('\n').slice(0, 1024),
    })
  }

  return {
    embeds: [
      {
        title: 'Lift feedback',
        color: 0x0071e3,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  const body = buildDiscordBody(payload)

  if (import.meta.env.DEV) {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error('Failed to send feedback. Check that DISCORD_FEEDBACK_WEBHOOK_URL is set in .env')
    }
    return
  }

  const { data, error } = await supabase.functions.invoke('send-feedback', {
    body,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}
