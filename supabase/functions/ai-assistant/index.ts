import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-2.0-flash'
const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSIONS = 768
const MAX_TOOL_ROUNDS = 3

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface WorkoutContext {
  workoutId: string
  currentExerciseId?: string
}

interface RequestBody {
  messages: ChatMessage[]
  includeUserData: boolean
  workoutContext?: WorkoutContext
  timezone?: string
}

interface FormChunk {
  content: string
  exercise_name: string
  section: string
  similarity: number
}

interface GeminiFunctionCall {
  name: string
  args: Record<string, unknown>
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function isRateLimitError(status: number, body: string): boolean {
  if (status === 429) return true
  return body.includes('RESOURCE_EXHAUSTED') || body.includes('quota')
}

async function geminiEmbed(apiKey: string, text: string, taskType: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType,
      output_dimensionality: EMBEDDING_DIMENSIONS,
    }),
  })
  const body = await res.text()
  if (!res.ok) {
    if (isRateLimitError(res.status, body)) {
      throw Object.assign(new Error('rate_limit'), { code: 'rate_limit' })
    }
    throw new Error(`Embedding failed: ${res.status} ${body}`)
  }
  const data = JSON.parse(body)
  const values = data.embedding?.values as number[] | undefined
  if (!values?.length) throw new Error('No embedding returned')
  return values
}

async function retrieveFormChunks(
  supabase: SupabaseClient,
  embedding: number[],
): Promise<FormChunk[]> {
  const { data, error } = await supabase.rpc('match_form_chunks', {
    query_embedding: embedding,
    match_count: 5,
    match_threshold: 0.65,
  })
  if (error) throw error
  return (data ?? []) as FormChunk[]
}

function buildSystemPrompt(chunks: FormChunk[], includeUserData: boolean): string {
  const lines = [
    'You are Nifty, a helpful coach inside the Lift workout tracker PWA.',
    'Be concise, friendly, and practical. Use plain language.',
    '',
  ]

  if (chunks.length > 0) {
    lines.push(
      'The following exercise form guidance was retrieved from the knowledge base. Use it for form questions; do not invent cues beyond this content:',
      '',
    )
    for (const chunk of chunks) {
      lines.push(
        `### ${chunk.exercise_name} (${chunk.section.replace(/_/g, ' ')})`,
        chunk.content,
        '',
      )
    }
    lines.push(
      'If the user asks about form for an exercise not covered above, say you do not have form guidance for that exercise yet.',
    )
  } else {
    lines.push(
      'No form guidance was retrieved for this query. If the user asks about exercise form, say you do not have form guidance for that exercise yet rather than inventing cues.',
    )
  }

  lines.push('')
  if (includeUserData) {
    lines.push(
      'The user has enabled workout data access. Use the provided tools to fetch their stats, workouts, and templates. Never invent numbers.',
      'Summarize data clearly; respect their unit preference when mentioned in tool results.',
    )
  } else {
    lines.push(
      'Workout data access is OFF. Do not claim specific stats, PRs, or workout history.',
      'If asked about their personal data, explain they can enable "Include my workout data" in Nifty.',
    )
  }

  return lines.join('\n')
}

function toolDeclarations(includeUserData: boolean, hasWorkoutContext: boolean) {
  if (!includeUserData) return []

  const tools = [
    {
      name: 'get_stats_overview',
      description: 'Get overview stats: total workouts, sets, reps, volume, cardio time, heaviest set, streak.',
      parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    {
      name: 'get_weekly_volume',
      description: 'Get weekly training volume for the last N weeks.',
      parameters: {
        type: 'OBJECT',
        properties: {
          weeks: { type: 'INTEGER', description: 'Number of weeks (1-52). Default 12.' },
        },
        required: [],
      },
    },
    {
      name: 'get_exercise_prs',
      description: 'Get personal records: best weight per exercise.',
      parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    {
      name: 'get_workout_streak',
      description: 'Get current consecutive workout day streak.',
      parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    {
      name: 'get_last_session',
      description: 'Get sets, reps, weights, and notes from the last completed session for an exercise.',
      parameters: {
        type: 'OBJECT',
        properties: {
          exercise_id: { type: 'STRING', description: 'UUID of the exercise.' },
        },
        required: ['exercise_id'],
      },
    },
    {
      name: 'get_recent_workouts',
      description: 'Get summary of recent completed workouts with exercises, sets, and notes.',
      parameters: {
        type: 'OBJECT',
        properties: {
          limit: { type: 'INTEGER', description: 'Number of workouts (1-20). Default 5.' },
        },
        required: [],
      },
    },
    {
      name: 'get_templates',
      description: 'Get workout templates with exercises and target sets/reps/weight.',
      parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
  ]

  if (hasWorkoutContext) {
    tools.push({
      name: 'get_active_workout',
      description: 'Get the current in-progress workout snapshot including logged sets and notes.',
      parameters: { type: 'OBJECT', properties: {}, required: [] },
    })
  }

  return tools
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  timezone: string,
  workoutContext?: WorkoutContext,
): Promise<unknown> {
  switch (name) {
    case 'get_stats_overview':
      return (await supabase.rpc('get_fun_stats', { p_tz: timezone })).data
    case 'get_weekly_volume': {
      const weeks = Math.min(52, Math.max(1, Number(args.weeks) || 12))
      return (await supabase.rpc('get_weekly_volume', { p_weeks: weeks })).data
    }
    case 'get_exercise_prs':
      return (await supabase.rpc('get_exercise_prs')).data
    case 'get_workout_streak':
      return (await supabase.rpc('get_workout_streak', { p_tz: timezone })).data
    case 'get_last_session':
      return (await supabase.rpc('get_last_session_for_exercise', {
        p_exercise_id: args.exercise_id,
      })).data
    case 'get_recent_workouts': {
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 5))
      return (await supabase.rpc('get_recent_workouts_summary', { p_limit: limit })).data
    }
    case 'get_templates':
      return (await supabase.rpc('get_my_templates_summary')).data
    case 'get_active_workout':
      if (!workoutContext?.workoutId) return { error: 'No active workout context' }
      return (await supabase.rpc('get_active_workout_snapshot', {
        p_workout_id: workoutContext.workoutId,
        p_current_exercise_id: workoutContext.currentExerciseId ?? null,
      })).data
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

type GeminiContent = {
  role: 'user' | 'model'
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: { result: unknown } } }
  >
}

async function geminiGenerate(
  apiKey: string,
  contents: GeminiContent[],
  systemPrompt: string,
  tools: ReturnType<typeof toolDeclarations>,
): Promise<{ text: string | null; functionCalls: GeminiFunctionCall[] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  }
  if (tools.length > 0) {
    body.tools = [{ functionDeclarations: tools }]
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const raw = await res.text()
  if (!res.ok) {
    if (isRateLimitError(res.status, raw)) {
      throw Object.assign(new Error('rate_limit'), { code: 'rate_limit' })
    }
    throw new Error(`Gemini generate failed: ${res.status} ${raw}`)
  }

  const data = JSON.parse(raw)
  const candidate = data.candidates?.[0]
  const parts = candidate?.content?.parts ?? []

  const functionCalls: GeminiFunctionCall[] = []
  let text: string | null = null

  for (const part of parts) {
    if (part.text) text = (text ?? '') + part.text
    if (part.functionCall) {
      functionCalls.push({ name: part.functionCall.name, args: part.functionCall.args ?? {} })
    }
  }

  return { text, functionCalls }
}

async function geminiStream(
  apiKey: string,
  contents: GeminiContent[],
  systemPrompt: string,
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  })
  if (!res.ok) {
    const raw = await res.text()
    if (isRateLimitError(res.status, raw)) {
      throw Object.assign(new Error('rate_limit'), { code: 'rate_limit' })
    }
    throw new Error(`Gemini stream failed: ${res.status} ${raw}`)
  }
  return res
}

function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const encoder = new TextEncoder()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase env not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Assistant not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as RequestBody
    const messages = Array.isArray(body.messages) ? body.messages : []
    const includeUserData = Boolean(body.includeUserData)
    const workoutContext = includeUserData ? body.workoutContext : undefined
    const timezone = typeof body.timezone === 'string' && body.timezone ? body.timezone : 'UTC'

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMessage?.content?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const embedding = await geminiEmbed(geminiApiKey, lastUserMessage.content.trim(), 'RETRIEVAL_QUERY')
    const formChunks = await retrieveFormChunks(supabase, embedding)
    const formRagUsed = formChunks.length > 0
    const systemPrompt = buildSystemPrompt(formChunks, includeUserData)
    const tools = toolDeclarations(includeUserData, Boolean(workoutContext?.workoutId))

    const geminiContents = toGeminiContents(messages)
    const toolsUsed: string[] = []
    let rounds = 0

    while (rounds < MAX_TOOL_ROUNDS) {
      const { text, functionCalls } = await geminiGenerate(
        geminiApiKey,
        geminiContents,
        systemPrompt,
        tools,
      )

      if (functionCalls.length === 0) {
        break
      }

      geminiContents.push({
        role: 'model',
        parts: functionCalls.map((fc) => ({ functionCall: { name: fc.name, args: fc.args } })),
      })

      for (const fc of functionCalls) {
        toolsUsed.push(fc.name)
        const result = await executeTool(fc.name, fc.args, supabase, timezone, workoutContext)
        geminiContents.push({
          role: 'user',
          parts: [{ functionResponse: { name: fc.name, response: { result } } }],
        })
      }

      rounds += 1
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const geminiRes = await geminiStream(geminiApiKey, geminiContents, systemPrompt)
          const reader = geminiRes.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let streamedAny = false

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const payload = line.slice(6).trim()
              if (payload === '[DONE]') continue
              try {
                const parsed = JSON.parse(payload)
                const parts = parsed.candidates?.[0]?.content?.parts ?? []
                for (const part of parts) {
                  if (part.text) {
                    streamedAny = true
                    controller.enqueue(encoder.encode(sseEvent('token', { text: part.text })))
                  }
                }
              } catch {
                // skip malformed SSE chunks
              }
            }
          }

          if (!streamedAny) {
            const { text } = await geminiGenerate(geminiApiKey, geminiContents, systemPrompt, [])
            if (text) {
              controller.enqueue(encoder.encode(sseEvent('token', { text })))
            }
          }

          controller.enqueue(
            encoder.encode(
              sseEvent('done', {
                formRagUsed,
                toolsUsed: [...new Set(toolsUsed)],
              }),
            ),
          )
          controller.close()
        } catch (err) {
          const code = (err as { code?: string }).code
          const message =
            code === 'rate_limit'
              ? "Nifty is busy right now — try again in a few minutes."
              : err instanceof Error
                ? err.message
                : 'Something went wrong'
          controller.enqueue(
            encoder.encode(sseEvent('error', { code: code ?? 'unknown', message })),
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'rate_limit') {
      return new Response(
        sseEvent('error', {
          code: 'rate_limit',
          message: "Nifty is busy right now — try again in a few minutes.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        },
      )
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
