export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/** Deterministic 2-letter initials for avatar fallbacks. */
export function initialsOf(name) {
  const value = (name || '').trim()
  if (!value) return '?'
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('en-PH').format(value)
}
