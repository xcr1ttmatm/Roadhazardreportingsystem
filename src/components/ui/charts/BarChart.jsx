import { cn } from '../utils'

const BARS = [
  'bg-gradient-to-t from-primary to-blue-400',
  'bg-gradient-to-t from-accent to-violet-400',
  'bg-gradient-to-t from-secondary to-purple-400',
]

/** Lightweight SVG-free bar chart. Data: [{ label, value }]. */
export default function BarChart({ data = [], height = 168, unit = '', className }) {
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1)
  const mid = Math.round(max / 2)

  return (
    <div className={cn('w-full', className)}>
      <div className="flex gap-3">
        <div
          className="flex shrink-0 flex-col justify-between pb-6 text-right text-[10px] font-medium text-ink-muted"
          style={{ height }}
          aria-hidden="true"
        >
          <span>{max}</span>
          <span>{mid}</span>
          <span>0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <span className="border-t border-dashed border-line-soft" />
              <span className="border-t border-dashed border-line-soft" />
              <span className="border-t border-line" />
            </div>

            <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2.5">
              {data.map((item, index) => {
                const value = Number(item.value) || 0
                const ratio = value / max
                return (
                  <div key={item.label} className="group flex h-full flex-1 items-end">
                    <div
                      title={`${item.label}: ${value}${unit ? ` ${unit}` : ''}`}
                      className={cn(
                        'relative w-full rounded-t-lg transition-all duration-500 hover:brightness-110',
                        BARS[index % BARS.length]
                      )}
                      style={{ height: `${Math.max(ratio * 100, value > 0 ? 4 : 0)}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        {value}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-2 flex gap-1.5 sm:gap-2.5">
            {data.map((item) => (
              <span
                key={item.label}
                className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-ink-muted"
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
