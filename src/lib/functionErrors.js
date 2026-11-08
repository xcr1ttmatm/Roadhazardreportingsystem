/**
 * Helpers for Edge Function calls that depend on Gemini.
 *
 * Supabase wraps a non-2xx response in a FunctionsHttpError, so the UI only
 * sees "Edge Function returned a non-2xx status code". Reading `error.context`
 * gives us the JSON body the function actually returned (e.g. Gemini 503
 * "high demand"), which we can show to the user in plain language.
 */

const GEMINI_BUSY = /UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED|"code"\s*:\s*503/i
const GEMINI_RATE = /"code"\s*:\s*429|rate.?limit|quota/i

/** Reads the JSON body Supabase attaches to a failed Edge Function call. */
export async function readFunctionError(error) {
  const response = error?.context
  if (response && typeof response.clone === 'function') {
    try {
      const body = await response.clone().json()
      if (typeof body?.error === 'string' && body.error.trim()) return body.error.trim()
      if (typeof body?.message === 'string' && body.message.trim()) return body.message.trim()
    } catch {
      /* response was not JSON - fall back to the generic message */
    }
  }
  return error?.message || 'Request failed'
}

/** Turns a raw Gemini/Edge Function error into something readable. */
export function friendlyAiError(message = '') {
  if (GEMINI_BUSY.test(message)) return 'Gemini is busy right now. Please try again in a minute.'
  if (GEMINI_RATE.test(message)) return 'The AI service is rate-limited right now. Please try again shortly.'
  return message || 'The AI service is unavailable right now.'
}

/** True only for explicit upstream availability/quota errors. */
export function isTransientAiError(message = '') {
  return GEMINI_BUSY.test(message) || GEMINI_RATE.test(message)
}

/**
 * Retries an idempotent AI call when Gemini explicitly reports 429/503.
 *
 * Network timeouts are NOT retried: a timeout may mean the function already
 * saved its result, so retrying could duplicate work. Only a clear upstream
 * error (which happens before any write) is safe to retry.
 */
export async function invokeWithAiRetry(invoke, { attempts = 2, delayMs = 1200 } = {}) {
  let result
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await invoke()
    const { error } = result ?? {}
    if (!error) return result

    const message = await readFunctionError(error)
    if (attempt === attempts || !isTransientAiError(message)) {
      return { ...result, friendlyError: friendlyAiError(message) }
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
  }
  return result
}
