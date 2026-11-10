// Severity display helpers.
//
// The database (and the trained model) keep using the original keys —
// 'severe' | 'moderate' | 'low'. Only the words shown to people change, so
// existing rows, detection results and RLS rules keep working untouched.
export const SEVERITY_COLORS = {
  severe: '#CE1126', // Danger
  moderate: '#FCD116', // Fair
  low: '#0F4C81', // Good
  default: '#9CA3AF',
}

export const SEVERITY_LABELS = {
  severe: 'Danger',
  moderate: 'Fair',
  low: 'Good',
  unspecified: 'Unspecified',
}

const normalise = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

/** "Danger" / "Fair" / "Good", or "Unspecified" when no level is set. */
export function severityLabel(value) {
  return SEVERITY_LABELS[normalise(value)] || SEVERITY_LABELS.unspecified
}

/** Dot colour for a severity, falling back to grey. */
export function severityColor(value) {
  return SEVERITY_COLORS[normalise(value)] || SEVERITY_COLORS.default
}
