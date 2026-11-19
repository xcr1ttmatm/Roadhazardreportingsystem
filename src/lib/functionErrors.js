/**
 * Helpers for Edge Function calls that depend on Gemini.
 *
 * Supabase wraps a non-2xx response in a FunctionsHttpError, so the UI only
 * sees "Edge Function returned a non-2xx status code". Reading `error.context`
 * gives us the JSON body the function actually returned (e.g. Gemini 503
 * "high demand"), which we can show to the user in plain language and, more
 * importantly, decide whether a retry is safe.
 */

const GEMINI_BUSY =
  /UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED|busy right now|service is busy|"code"\s*:\s*503|\b503\b/i
const GEMINI_RATE = /"code"\s*:\s*429|\b429\b|rate.?limit|quota/i
const NETWORK_FAILURE = /fetch failed|could not be reached|timed out|timeout|aborted|network/i

function isRetryableStatus(status) {
  // 0 = timeout/network failure (no HTTP response), 429 = quota, >=500 = upstream outage.
  return status === 0 || status === 429 || status >= 500
}

/** Turns a raw Gemini/Edge Function error into something readable. */
export function friendlyAiError(message = '') {
  if (GEMINI_BUSY.test(message)) {
    return 'The AI service is busy right now. Please try again in a moment.'
  }
  if (GEMINI_RATE.test(message)) {
    return 'The AI service is rate-limited right now. Please try again shortly.'
  }
  if (NETWORK_FAILURE.test(message)) {
    return 'The AI service could not be reached. Please check your connection and try again.'
  }
  return message || 'The AI service is unavailable right now.'
}

/** True for explicit upstream availability, quota, and network failures. */
export function isTransientAiError(message = '') {
  return GEMINI_BUSY.test(message) || GEMINI_RATE.test(message) || NETWORK_FAILURE.test(message)
}

/**
 * Reads a failed Edge Function call into structured failure information.
 *
 * Supabase's own error text is generic, so the HTTP status and the function's
 * `retryable` flag (when present) are the reliable signals. We keep the raw
 * message for display but expose `retryable` for the retry loop.
 */
export async function readFunctionFailure(error) {
  const response = error?.context
  let body = null

  if (response && typeof response.clone === 'function') {
    try {
      body = await response.clone().json()
    } catch {
      /* response was not JSON - fall back to the generic message */
    }
  }

  const status = Number(response?.status) || 0
  const message =
    (typeof body?.error === 'string' && body.error.trim()) ||
    (typeof body?.message === 'string' && body.message.trim()) ||
    error?.message ||
    'Request failed'

  // Trust the function's explicit flag when it sends one; otherwise infer it
  // from the status code and the message text.
  const retryable =
    typeof body?.retryable === 'boolean'
      ? body.retryable
      : isRetryableStatus(status) || isTransientAiError(message)

  return { message, status, retryable }
}

/** Reads the JSON body Supabase attaches to a failed Edge Function call. */
export async function readFunctionError(error) {
  return (await readFunctionFailure(error)).message
}

/**
 * Retries an AI call when Gemini reports a transient failure (503/429/network).
 *
 * Timeouts are retried too: the Edge Function writes only after a successful
 * generation, and `onRetry` lets the caller re-read shared state so a result
 * saved just before a timeout is detected instead of regenerated.
 *
 * @param {() => Promise<any>} invoke
 * @param {object} [options]
 * @param {number} [options.attempts]       total calls (default 2)
 * @param {number} [options.delayMs]        base backoff (default 900)
 * @param {(ctx: {attempt: number, attempts: number, failure: object, result: any}) => boolean|void} [options.onRetry]
 *        Called before each retry. Return false to stop retrying.
 */
export async function invokeWithAiRetry(invoke, { attempts = 2, delayMs = 900, onRetry } = {}) {
  let result
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await invoke()
    const { error, data } = result ?? {}

    // A non-2xx response is the normal failure path. A 200 carrying
    // `retryable: true` is also possible if the function normalizes upstream
    // errors into its JSON body, so treat that as a failure too.
    if (!error && !data?.retryable) return result

    const failure = error
      ? await readFunctionFailure(error)
      : { message: data?.error || 'Request failed', status: 0, retryable: true }

    if (attempt === attempts || !failure.retryable) {
      return { ...result, friendlyError: friendlyAiError(failure.message), failure }
    }

    if (onRetry) {
      const shouldContinue = await onRetry({ attempt, attempts, failure, result })
      if (shouldContinue === false) return result
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
  }
  return result
}
