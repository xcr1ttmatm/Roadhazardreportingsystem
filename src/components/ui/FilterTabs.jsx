import { cn } from './utils'

/** Scrollable pill filter bar. Options: [{ value, label, count? }] */
export default function FilterTabs({ options, value, onChange, className }) {
  return (
    <div
      className={cn(
        'flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-soft no-scrollbar',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              active
                ? 'bg-brand-gradient text-white shadow-[0_6px_16px_-8px_rgba(79,70,229,0.7)]'
                : 'text-ink-soft hover:bg-canvas hover:text-ink'
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-soft'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
