import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, ScanSearch, ShieldCheck } from 'lucide-react'

// Camera-viewfinder corners laid over the photo being analyzed.
const BRACKETS = [
  'left-2 top-2 rounded-tl-lg border-l-2 border-t-2',
  'right-2 top-2 rounded-tr-lg border-r-2 border-t-2',
  'left-2 bottom-2 rounded-bl-lg border-l-2 border-b-2',
  'right-2 bottom-2 rounded-br-lg border-r-2 border-b-2',
]

/**
 * Blocking full-screen state while the on-device model analyzes the first
 * uploaded photo. Deliberately self-contained: SubmitReport opts in with one
 * flag, so it can be removed without touching any detection/save logic.
 */
export default function DetectionLoadingOverlay({ open, imageUrl }) {
  // Stop the page behind the scrim from scrolling while analysis is in flight.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  // Portal to <body> so Leaflet's own 200-1000 z-index panes cannot paint
  // above the scrim, and no transformed ancestor can trap it.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-primary-light/95 via-canvas/95 to-secondary-light/95 px-6 text-center backdrop-blur-sm"
    >
      <div className="relative mt-1 w-80 max-w-full">
        <div aria-hidden="true" className="absolute -inset-4 rounded-[28px] bg-primary/15 blur-2xl" />

        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl shadow-primary/20 ring-4 ring-white/80">
          {imageUrl ? (
            <img src={imageUrl} alt="Photo being analyzed" className="block h-52 w-full object-cover" />
          ) : (
            <div className="flex h-52 w-full items-center justify-center bg-canvas">
              <ScanSearch className="h-12 w-12 text-primary/40" />
            </div>
          )}

          {/* Faint detection grid over the photo. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
            }}
          />

          {/* Sweeping scan line: transform-only so it keeps moving even when
              the single-thread WASM inference briefly blocks the main thread. */}
          <span
            aria-hidden="true"
            className="animate-hazard-scan pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 motion-reduce:animate-none"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <span className="absolute right-0 top-0 h-full w-0.5 bg-primary shadow-[0_0_12px_3px_rgba(37,99,235,0.6)]" />
          </span>

          {BRACKETS.map((position) => (
            <span
              key={position}
              aria-hidden="true"
              className={`pointer-events-none absolute h-7 w-7 border-white/90 drop-shadow ${position}`}
            />
          ))}

          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg ring-4 ring-white/50 motion-reduce:animate-none"
          >
            <ScanSearch className="h-8 w-8" strokeWidth={1.9} />
          </span>

          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-primary shadow-md"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        </div>
      </div>

      <h2 className="mt-7 text-xl font-bold text-ink">Analyzing your photo</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        The trained model is scanning your first photo for road hazards. The form is paused until it finishes so the
        result is saved correctly with your report.
      </p>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
        Scanning in progress · usually a few seconds
      </p>

      <p className="mt-7 flex items-center gap-1.5 text-[11px] text-ink-muted">
        <ShieldCheck className="h-3.5 w-3.5" />
        Please keep this page open.
      </p>
    </div>,
    document.body
  )
}
