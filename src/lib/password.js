/** Shared password rules and Supabase error translation. */

export const MIN_PASSWORD_LENGTH = 8

/** Turns Supabase auth errors into plain language. */
export function friendlyPasswordError(message = '') {
  if (/different from the old|should be different/i.test(message)) {
    return 'Choose a password that is different from your current one.'
  }
  if (/at least|too short|length/i.test(message)) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (/invalid login|invalid credentials/i.test(message)) {
    return 'Current password is incorrect.'
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many attempts. Please wait a minute and try again.'
  }
  if (/weak|pwned|leaked/i.test(message)) {
    return 'That password is too weak or has appeared in a data breach. Try another one.'
  }
  return message || 'Could not update your password.'
}
