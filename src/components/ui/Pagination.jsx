import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from './utils'

function pageWindow(page, pageCount) {
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  const list = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const withGaps = []
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1] > 1) withGaps.push('…')
    withGaps.push(p)
  })
  return withGaps
}

export default function Pagination({ page, pageCount, onChange, total, pageSize, className }) {
  if (pageCount <= 1) return null

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const navButton =
    'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-3 border-t border-line-soft px-1 pt-4 sm:flex-row',
        className
      )}
    >
      <p className="text-xs text-ink-soft">
        Showing <span className="font-semibold text-ink">{from}</span>–
        <span className="font-semibold text-ink">{to}</span> of{' '}
        <span className="font-semibold text-ink">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(navButton, 'text-ink-soft hover:bg-canvas hover:text-ink')}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {pageWindow(page, pageCount).map((item, i) =>
          item === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-ink-muted">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                navButton,
                item === page
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'text-ink-soft hover:bg-canvas hover:text-ink'
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className={cn(navButton, 'text-ink-soft hover:bg-canvas hover:text-ink')}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
