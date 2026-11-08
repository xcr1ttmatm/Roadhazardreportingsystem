import { cn } from '../utils'

const RADIUS = 48
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SWATCHES = ['#2563eb', '#7c3aed', '#4f46e5', '#059669', '#d97706', '#dc2626', '#0284c7']

/**
 * Lightweight SVG donut. Data: [{ label, value, color? }].
 * Every slice is derived from real values — nothing is fabricated.
 */
export default function DonutChart({
  data = [],
  size = 172,
  centerLabel = 'Total',
  centerValue,
  showLegend = true,
  className,
}) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  const slices = data
    .map((item, index) => ({ ...item, value: Number(item.value) || 0, color: item.color ?? SWATCHES[index % SWATCHES.length] }))
    .filter((item) => item.value > 0)

  // Pre-compute each arc's length and start offset without mutating render-scope state.
  const arcs = slices.map((slice, index) => {
    const length = (slice.value / total) * CIRCUMFERENCE
    const offset = slices
      .slice(0, index)
      .reduce((sum, previous) => sum + (previous.value / total) * CIRCUMFERENCE, 0)

    return { ...slice, length, offset, dash: Math.max(length - 2.5, 0.5) }
  })

  return (
    <div className={cn('flex flex-col items-center gap-5 sm:flex-row sm:items-center', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${centerLabel}: ${total}`}>
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#EEF2F7" strokeWidth="14" />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={-arc.offset}
              className="transition-all duration-700"
            >
              <title>{`${arc.label}: ${arc.value}`}</title>
            </circle>
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-bold leading-none tracking-tight text-ink">
            {centerValue ?? total}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{centerLabel}</span>
        </div>
      </div>

      {showLegend && (
        <div className="w-full min-w-0 space-y-2">
          {data.map((item, index) => {
            const value = Number(item.value) || 0
            const percent = total > 0 ? Math.round((value / total) * 100) : 0
            return (
              <div key={item.label} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color ?? SWATCHES[index % SWATCHES.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-soft">{item.label}</span>
                <span className="text-xs font-semibold text-ink">{value}</span>
                <span className="w-9 text-right text-[11px] text-ink-muted">{percent}%</span>
              </div>
            )
          })}
          {total === 0 && <p className="text-xs text-ink-muted">No data yet.</p>}
        </div>
      )}
    </div>
  )
}
