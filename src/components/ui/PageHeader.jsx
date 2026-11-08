import { cn } from './utils'

export default function PageHeader({ eyebrow, title, description, actions, icon: Icon, className }) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex items-start gap-3.5">
        {Icon && (
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow-blue sm:flex">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          {eyebrow && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px] sm:leading-tight">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  )
}
