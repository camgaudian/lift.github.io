#!/usr/bin/env node
/**
 * Ingest form-article markdown into form_article_chunks with Gemini embeddings.
 *
 * Usage (from project root):
 *   node scripts/ingest-form-articles.mjs
 *   node scripts/ingest-form-articles.mjs --force   # re-embed all chunks
 *
 * Requires GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_URL
 * (or VITE_SUPABASE_URL in .env). See supabase/AI_ASSISTANT_SETUP.md.
 */

import { createClient } from '@supabase/supabase-js'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const ARTICLES_DIR = join(ROOT_DIR, 'supabase', 'content', 'form-articles')

/** Load KEY=value lines from .env into process.env (does not override existing vars). */
function loadDotEnv() {
  const envPath = join(ROOT_DIR, '.env')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env) || process.env[key] === '') {
      process.env[key] = value
    }
  }
}

loadDotEnv()

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const missing = []
if (!GEMINI_API_KEY) missing.push('GEMINI_API_KEY')
if (!SUPABASE_URL) missing.push('SUPABASE_URL (or VITE_SUPABASE_URL in .env)')
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')

if (missing.length > 0) {
  console.error('Missing environment variables:')
  for (const name of missing) console.error(`  - ${name}`)
  console.error('')
  console.error('PowerShell example:')
  console.error('  $env:GEMINI_API_KEY = "your-gemini-key"')
  console.error('  $env:SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"')
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"')
  console.error('  node scripts/ingest-form-articles.mjs')
  console.error('')
  console.error('Or add VITE_SUPABASE_URL to .env and set the other two vars above.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSIONS = 768
/** Free tier: 100 embed requests/min — stay under with pacing + retries */
const MIN_INTERVAL_MS = 700
const MAX_EMBEDS_PER_MINUTE = 90
const FORCE_REEMBED = process.argv.includes('--force')

let lastEmbedAt = 0
let embedsThisMinute = 0
let minuteWindowStart = Date.now()

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRetryDelayMs(body) {
  try {
    const parsed = JSON.parse(body)
    const retryInfo = parsed.error?.details?.find((d) =>
      String(d['@type'] ?? '').includes('RetryInfo'),
    )
    const delay = retryInfo?.retryDelay
    if (typeof delay === 'string') {
      const sec = parseFloat(delay.replace(/s$/, ''))
      if (!Number.isNaN(sec)) return Math.ceil(sec * 1000) + 1500
    }
    const match = parsed.error?.message?.match(/retry in ([\d.]+)s/i)
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1500
  } catch {
    // ignore parse errors
  }
  return 35_000
}

async function paceEmbeds() {
  const now = Date.now()
  if (now - minuteWindowStart >= 60_000) {
    minuteWindowStart = now
    embedsThisMinute = 0
  }
  if (embedsThisMinute >= MAX_EMBEDS_PER_MINUTE) {
    const waitMs = 60_000 - (now - minuteWindowStart) + 1500
    console.log(`Pacing: ${embedsThisMinute} embeds this minute — waiting ${Math.ceil(waitMs / 1000)}s…`)
    await sleep(waitMs)
    minuteWindowStart = Date.now()
    embedsThisMinute = 0
  }
  const sinceLast = Date.now() - lastEmbedAt
  if (sinceLast < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - sinceLast)
  }
  lastEmbedAt = Date.now()
  embedsThisMinute += 1
}

async function embedText(text, attempt = 0) {
  await paceEmbeds()

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
      output_dimensionality: EMBEDDING_DIMENSIONS,
    }),
  })

  const body = await res.text()

  if (res.status === 429 && attempt < 8) {
    const waitMs = parseRetryDelayMs(body)
    console.log(`Rate limited (429) — waiting ${Math.ceil(waitMs / 1000)}s before retry…`)
    await sleep(waitMs)
    minuteWindowStart = Date.now()
    embedsThisMinute = 0
    return embedText(text, attempt + 1)
  }

  if (!res.ok) {
    throw new Error(`Embedding failed: ${res.status} ${body}`)
  }

  const data = JSON.parse(body)
  const values = data.embedding?.values
  if (!values?.length) throw new Error('No embedding values returned')
  return values
}

async function chunkExists(sourceSlug, section) {
  const { data, error } = await supabase
    .from('form_article_chunks')
    .select('id')
    .eq('source_slug', sourceSlug)
    .eq('section', section)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

function parseMarkdown(raw, sourceSlug) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  let exerciseName = ''
  const chunks = []

  let currentSection = ''
  let currentLines = []

  const flush = () => {
    const content = currentLines.join('\n').trim()
    if (currentSection && content) {
      chunks.push({
        exercise_name: exerciseName,
        section: currentSection,
        content,
        source_slug: sourceSlug,
      })
    }
    currentLines = []
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      exerciseName = line.slice(2).trim()
      continue
    }
    if (line.startsWith('## ')) {
      flush()
      currentSection = line.slice(3).trim().toLowerCase().replace(/\s+/g, '_')
      continue
    }
    if (currentSection) {
      currentLines.push(line)
    }
  }
  flush()

  if (!exerciseName) {
    throw new Error(`${sourceSlug}: missing # exercise title`)
  }
  if (chunks.length === 0) {
    throw new Error(`${sourceSlug}: no ## sections found`)
  }

  return chunks
}

async function upsertChunk(chunk, embedding) {
  const { error } = await supabase.from('form_article_chunks').upsert(
    {
      exercise_name: chunk.exercise_name,
      section: chunk.section,
      content: chunk.content,
      embedding,
      source_slug: chunk.source_slug,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'source_slug,section' },
  )
  if (error) throw error
}

async function main() {
  let files
  try {
    files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.md'))
  } catch {
    console.error(`Articles directory not found: ${ARTICLES_DIR}`)
    process.exit(1)
  }

  if (files.length === 0) {
    console.log('No .md files found.')
    return
  }

  let total = 0
  let skipped = 0
  for (const file of files.sort()) {
    const sourceSlug = basename(file, '.md')
    const raw = await readFile(join(ARTICLES_DIR, file), 'utf8')
    const chunks = parseMarkdown(raw, sourceSlug)
    console.log(`${file}: ${chunks.length} chunk(s)`)

    for (const chunk of chunks) {
      if (!FORCE_REEMBED && (await chunkExists(chunk.source_slug, chunk.section))) {
        skipped += 1
        continue
      }

      const embedInput = `${chunk.exercise_name} — ${chunk.section.replace(/_/g, ' ')}\n\n${chunk.content}`
      const embedding = await embedText(embedInput)
      await upsertChunk(chunk, embedding)
      total += 1
    }
  }

  console.log(`Done. Upserted ${total} chunk(s).${skipped ? ` Skipped ${skipped} existing.` : ''}`)
  if (skipped && !FORCE_REEMBED) {
    console.log('Re-embed all with: node scripts/ingest-form-articles.mjs --force')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
