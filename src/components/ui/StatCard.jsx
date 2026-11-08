import { cn } from './utils'

const GRADIENTS = {
  blue: 'bg-gradient-to-br from-primary via-blue-600 to-indigo-600 text-white shadow-glow-blue',
  purple: 'bg-gradient-to-br from-secondary via-violet-600 to-indigo-600 text-white shadow-glow-purple',
  indigo: 'bg-gradient-to-br from-accent via-indigo-600 to-primary text-white shadow-glow-blue',
}

const LIGHT_ICONS = {
  blue: 'bg-primary-light text-primary',
  purple: 'bg-secondary-light text-secondary',
  indigo: 'bg-accent-light text-accent',
  green: 'bg-success-light text-success',
  amber: 'bg-warning-light text-warning',
  red: 'bg-danger-light text-danger',
  slate: 'bg-slate-100 text-slate-500',
}

/**
 * Dashboard metric card. Gradient variants are used sparingly for the two
 * hero metrics; everything else stays white.
 * `trend` is only rendered when a real value is passed in.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'light',
  tone = 'blue',
  hint,
  trend,
  loading = false,
  className,
  style,
}) {
  const isGradient = variant !== 'light'

  return (
    <div
      style={style}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5',
        isGradient
          ? cn('border-transparent', GRADIENTS[variant] ?? GRADIENTS.blue)
          : 'border-line bg-surface shadow-soft hover:shadow-float',
        className
      )}
    >
      {isGradient && (
        <>
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-12 right-6 h-24 w-24 rounded-full bg-white/10" />
        </>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-[12px] font-semibold', isGradient ? 'text-white/80' : 'text-ink-soft')}>{label}</p>
          {loading ? (
            <div
              className={cn(
                'mt-2 h-8 w-16 animate-pulse rounded-lg',
                isGradient ? 'bg-white/25' : 'bg-slate-100'
              )}
            />
          ) : (
            <p
              className={cn(
                'mt-1.5 text-[28px] font-bold leading-none tracking-tight',
                isGradient ? 'text-white' : 'text-ink'
              )}
            >
              {value}
            </p>
          )}
          {hint && (
            <p className={cn('mt-2 text-[11px] leading-snug', isGradient ? 'text-white/75' : 'text-ink-muted')}>
              {hint}
            </p>
          )}
        </div>

        {Icon && (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              isGradient ? 'bg-white/15 text-white ring-1 ring-inset ring-white/25' : LIGHT_ICONS[tone] ?? LIGHT_ICONS.blue
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>

      {trend && (
        <p
          className={cn(
            'relative mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            isGradient ? 'bg-white/15 text-white' : 'bg-success-light text-success'
          )}
        >
          {trend}
        </p>
      )}
    </div>
  )
}
