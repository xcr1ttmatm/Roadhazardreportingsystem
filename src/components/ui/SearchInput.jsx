import { Search, X } from 'lucide-react'
import { cn } from './utils'

export default function SearchInput({ value, onChange, placeholder = 'Search…', className, ...props }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-9 text-sm text-ink placeholder:text-ink-muted shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition hover:bg-canvas hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
