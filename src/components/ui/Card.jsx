import { cn } from './utils'

/**
 * White rounded surface used across the app.
 * `tone="gradient"` turns it into the featured blue→purple panel.
 */
export default function Card({ className, children, tone = 'default', hover = false, ...props }) {
  const tones = {
    default: 'border border-line bg-surface shadow-soft',
    muted: 'border border-line bg-canvas/70',
    gradient: 'border border-transparent bg-brand-gradient text-white shadow-glow-blue',
    'soft-blue': 'border border-primary/10 bg-gradient-to-br from-primary-light/70 via-white to-white shadow-soft',
    'soft-purple': 'border border-secondary/10 bg-gradient-to-br from-secondary-light/70 via-white to-white shadow-soft',
  }

  return (
    <div
      className={cn(
        'rounded-2xl',
        tones[tone] ?? tones.default,
        hover && 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-float',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, title, description, action, icon: Icon }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light/70 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
