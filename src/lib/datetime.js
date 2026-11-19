// Shared timestamp formatting for the Philippine timezone.
//
// Supabase stores timestamps in UTC. Rendering them with the browser's local
// timezone made the same report show different times on different devices, so
// every dashboard uses this explicit Asia/Manila formatter instead.

const PHT_DATE_TIME = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

/** Example: `Nov 19, 2026 · 9:43 PM PHT`. */
export function formatPhtDateTime(value) {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const parts = Object.fromEntries(
    PHT_DATE_TIME.formatToParts(date).map(({ type, value: part }) => [type, part])
  )
  const calendarDate = `${parts.month} ${parts.day}, ${parts.year}`
  const clock = `${parts.hour}:${parts.minute} ${parts.dayPeriod ?? ''}`.trim()

  return `${calendarDate} · ${clock} PHT`
}
