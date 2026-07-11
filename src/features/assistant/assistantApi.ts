import { supabase } from '@/lib/supabase'

export interface AssistantChatMessage {
  role: 'user' | 'assistant'
  content: string
  formRagUsed?: boolean
}

export interface WorkoutContextPayload {
  workoutId: string
  currentExerciseId?: string
}

export interface StreamAssistantOptions {
  messages: AssistantChatMessage[]
  includeUserData: boolean
  workoutContext?: WorkoutContextPayload
  signal?: AbortSignal
  onToken: (text: string) => void
  onDone: (meta: { formRagUsed: boolean; toolsUsed: string[] }) => void
  onError: (error: { code: string; message: string }) => void
}

function getFunctionsUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) throw new Error('Supabase is not configured')
  return `${base.replace(/\/$/, '')}/functions/v1/ai-assistant`
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = 'message'
  let data = ''
  for (const line of block.split('\n')) {
    if (line.startsWith('event: ')) event = line.slice(7).trim()
    if (line.startsWith('data: ')) data += line.slice(6)
  }
  if (!data) return null
  return { event, data }
}

export async function streamAssistantReply(options: StreamAssistantOptions): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not signed in')

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const res = await fetch(getFunctionsUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      messages: options.messages.map(({ role, content }) => ({ role, content })),
      includeUserData: options.includeUserData,
      workoutContext: options.workoutContext,
      timezone,
    }),
    signal: options.signal,
  })

  if (!res.ok && res.headers.get('Content-Type')?.includes('application/json')) {
    const payload = await res.json().catch(() => ({}))
    options.onError({
      code: 'unknown',
      message: (payload as { error?: string }).error ?? 'Assistant request failed',
    })
    return
  }

  if (!res.body) {
    options.onError({ code: 'unknown', message: 'No response from assistant' })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const parsed = parseSseBlock(block.trim())
      if (!parsed) continue
      try {
        const payload = JSON.parse(parsed.data) as Record<string, unknown>
        if (parsed.event === 'token' && typeof payload.text === 'string') {
          options.onToken(payload.text)
        } else if (parsed.event === 'done') {
          options.onDone({
            formRagUsed: Boolean(payload.formRagUsed),
            toolsUsed: Array.isArray(payload.toolsUsed) ? (payload.toolsUsed as string[]) : [],
          })
        } else if (parsed.event === 'error') {
          options.onError({
            code: typeof payload.code === 'string' ? payload.code : 'unknown',
            message:
              typeof payload.message === 'string'
                ? payload.message
                : "Something went wrong. Please try again.",
          })
        }
      } catch {
        // ignore malformed events
      }
    }
  }
}

export function friendlyAssistantError(code: string, message: string): string {
  if (code === 'rate_limit') {
    return "Nifty is busy right now — try again in a few minutes."
  }
  return message
}
