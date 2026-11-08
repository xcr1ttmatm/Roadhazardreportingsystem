import { Inbox } from 'lucide-react'
import { cn } from './utils'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center',
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-secondary-light text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-soft">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
