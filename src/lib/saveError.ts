/** User-facing messages for workout / entry persistence failures. */

const MESSAGES = {
  offline: 'Poor connection',
  timeout: 'Timed out',
  auth: 'Session expired',
  permission: 'No permission',
  server: 'Server failed',
  generic: "Couldn't save",
} as const

type ErrorBits = {
  message: string
  details: string
  hint: string
  code: string
  name: string
  status: number | null
}

function asRecord(err: unknown): Record<string, unknown> | null {
  if (err && typeof err === 'object') return err as Record<string, unknown>
  return null
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readStatus(err: unknown): number | null {
  const obj = asRecord(err)
  if (!obj) return null
  for (const key of ['status', 'statusCode', 'status_code'] as const) {
    const value = obj[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function extractBits(err: unknown): ErrorBits {
  if (typeof err === 'string') {
    return { message: err, details: '', hint: '', code: '', name: '', status: null }
  }

  const obj = asRecord(err)
  const cause = obj ? asRecord(obj.cause) : null

  return {
    message: readString(obj?.message) || (err instanceof Error ? err.message : ''),
    details: readString(obj?.details) || readString(cause?.message),
    hint: readString(obj?.hint),
    code: readString(obj?.code) || readString(cause?.code),
    name: readString(obj?.name) || (err instanceof Error ? err.name : ''),
    status: readStatus(err),
  }
}

function combinedText(bits: ErrorBits): string {
  return [bits.name, bits.message, bits.details, bits.hint, bits.code].join(' ').toLowerCase()
}

const NETWORK_CODE_RE =
  /^(econnrefused|econnreset|econnaborted|enotfound|etimedout|enetunreach|ehostunreach|eai_again|err_network|err_internet_disconnected|err_connection_|err_name_not_resolved|err_timed_out)$/i

const NETWORK_TEXT_RE =
  /failed to fetch|fetch failed|networkerror|network request failed|net::err_|load failed|connection (refused|reset|timed out|terminated)|dns|offline|no internet|internet disconnected|socket hang up|unreachable/

const TIMEOUT_TEXT_RE = /timeout|timed out|aborted|aborterror/

const AUTH_TEXT_RE =
  /not authenticated|jwt expired|invalid jwt|invalid claim|session.?expired|refresh.?token|unauthorized|login required/

const AUTH_CODES = new Set(['PGRST301', '401'])

const PERMISSION_TEXT_RE =
  /row-level security|rls|permission denied|not authorized|violates row-level security|42501/

const SERVER_TEXT_RE =
  /internal server error|bad gateway|service unavailable|gateway timeout|cloudflare|upstream|server error|database error|could not connect to server|too many connections|statement timeout/

/** Postgres / PostgREST codes that usually mean the backend rejected or broke the write. */
const SERVER_CODES = new Set([
  '08000',
  '08001',
  '08003',
  '08006',
  '08004',
  '57P01',
  '57P02',
  '57P03',
  '53000',
  '53100',
  '53200',
  '53300',
  '53400',
  'PGRST000',
  'PGRST001',
  'PGRST002',
  'PGRST003',
])

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function isNetworkFailure(bits: ErrorBits, text: string): boolean {
  if (isOffline()) return true
  if (NETWORK_CODE_RE.test(bits.code)) return true
  if (bits.name === 'NetworkError') return true
  if (NETWORK_TEXT_RE.test(text)) return true
  // Fetch failures often arrive as TypeError with empty PostgREST code.
  if (bits.name === 'TypeError' && /fetch/i.test(bits.message)) return true
  return false
}

function isTimeout(bits: ErrorBits, text: string): boolean {
  if (bits.name === 'AbortError' || bits.code === 'ETIMEDOUT' || bits.code === '57014') return true
  return TIMEOUT_TEXT_RE.test(text)
}

function isAuthFailure(bits: ErrorBits, text: string): boolean {
  if (bits.status === 401) return true
  if (AUTH_CODES.has(bits.code.toUpperCase())) return true
  return AUTH_TEXT_RE.test(text)
}

function isPermissionFailure(bits: ErrorBits, text: string): boolean {
  if (bits.code === '42501' || bits.status === 403) return true
  return PERMISSION_TEXT_RE.test(text)
}

function isServerFailure(bits: ErrorBits, text: string): boolean {
  if (bits.status != null && bits.status >= 500) return true
  if (SERVER_CODES.has(bits.code.toUpperCase())) return true
  // Postgres SQLSTATE class 08 = connection exception, 53 = insufficient resources,
  // 57 = operator intervention / query canceled (non-client).
  if (/^(08|53|57)/.test(bits.code)) return true
  // Most other Postgres SQLSTATEs / PostgREST codes mean the API handled the
  // request but the write failed server-side (constraints, schema, etc.).
  if (/^[0-9A-Z]{5}$/i.test(bits.code) || /^PGRST\d+/i.test(bits.code)) return true
  return SERVER_TEXT_RE.test(text)
}

function looksLikeApiError(bits: ErrorBits): boolean {
  return Boolean(bits.code || bits.details || bits.hint || bits.name === 'PostgrestError')
}

/**
 * Map a thrown Supabase / fetch / app error to a short message suitable for
 * autosave status and workout action footers.
 */
export function formatSaveError(err: unknown, fallback: string = MESSAGES.generic): string {
  const bits = extractBits(err)
  const text = combinedText(bits)

  if (isNetworkFailure(bits, text)) return MESSAGES.offline
  if (isTimeout(bits, text)) return MESSAGES.timeout
  if (isAuthFailure(bits, text)) return MESSAGES.auth
  if (isPermissionFailure(bits, text)) return MESSAGES.permission
  if (isServerFailure(bits, text)) return MESSAGES.server
  if (looksLikeApiError(bits)) return MESSAGES.server

  // Intentionally thrown app messages (e.g. "Not authenticated").
  if (bits.message && AUTH_TEXT_RE.test(bits.message.toLowerCase())) return MESSAGES.auth

  return fallback
}
