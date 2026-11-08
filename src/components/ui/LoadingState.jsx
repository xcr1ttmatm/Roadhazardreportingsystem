import { Loader2 } from 'lucide-react'
import { cn } from './utils'

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-primary', className)} />
}

export default function LoadingState({ label = 'Loading…', rows = 0, className }) {
  if (rows > 0) {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft">
            <div className="skeleton h-12 w-12 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
            <div className="skeleton hidden h-6 w-20 rounded-full sm:block" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center gap-2.5 py-14 text-sm text-ink-soft', className)}>
      <Spinner />
      {label}
    </div>
  )
}
