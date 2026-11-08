import { cn } from './utils'

const TONES = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200/70',
  blue: 'bg-primary-light text-primary ring-primary/15',
  purple: 'bg-secondary-light text-secondary-dark ring-secondary/15',
  indigo: 'bg-accent-light text-accent ring-accent/15',
  success: 'bg-success-light text-success ring-success/15',
  warning: 'bg-warning-light text-warning ring-warning/20',
  danger: 'bg-danger-light text-danger ring-danger/15',
  info: 'bg-info-light text-info ring-info/15',
}

const DOT_TONES = {
  neutral: 'bg-slate-400',
  blue: 'bg-primary',
  purple: 'bg-secondary',
  indigo: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        TONES[tone] ?? TONES.neutral,
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT_TONES[tone] ?? DOT_TONES.neutral)} />}
      {children}
    </span>
  )
}

/* Status labels/tone for hazard reports and inspector assignments. */
const STATUS = {
  pending: { label: 'Pending', tone: 'neutral' },
  under_review: { label: 'Under Review', tone: 'blue' },
  verified: { label: 'Verified', tone: 'indigo' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  resolved: { label: 'Resolved', tone: 'success' },
  accepted: { label: 'In Progress', tone: 'blue' },
  completed: { label: 'Completed', tone: 'success' },
}

export function StatusBadge({ status, className, dot = true }) {
  const config = STATUS[status] ?? STATUS.pending
  return (
    <Badge tone={config.tone} dot={dot} className={className}>
      {config.label}
    </Badge>
  )
}

const SEVERITY = {
  severe: { label: 'Severe', tone: 'danger', color: '#dc2626' },
  moderate: { label: 'Moderate', tone: 'warning', color: '#d97706' },
  low: { label: 'Low', tone: 'info', color: '#0284c7' },
}

export function SeverityBadge({ severity, className }) {
  const key = typeof severity === 'string' ? severity.trim().toLowerCase() : ''
  if (!key) return null
  const config = SEVERITY[key] ?? { label: key, tone: 'neutral', color: '#94a3b8' }
  return (
    <Badge tone={config.tone} dot className={className}>
      {config.label}
    </Badge>
  )
}

export function RoleBadge({ role, className }) {
  const config =
    role === 'admin'
      ? { label: 'Admin', tone: 'purple' }
      : role === 'inspector'
        ? { label: 'Inspector', tone: 'warning' }
        : { label: 'Citizen', tone: 'blue' }
  return (
    <Badge tone={config.tone} className={cn('capitalize', className)}>
      {config.label}
    </Badge>
  )
}
