import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react'

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
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg shadow-primary/25">
          <Sparkles className="h-9 w-9" strokeWidth={1.8} />
        </span>
        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-line">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      </div>

      <h2 className="mt-7 text-xl font-bold text-ink">Analyzing your photo</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        The trained model is checking your first photo for road hazards. The form is paused until it finishes so the
        result is saved correctly with your report.
      </p>

      {/* Indeterminate on purpose — the model does not expose real progress. */}
      <div className="mt-6 h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-line/70">
        <div className="h-full w-2/5 animate-pulse rounded-full bg-brand-gradient" />
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        This usually takes a few seconds
      </p>

      {imageUrl && (
        <div className="mt-7">
          <div className="mx-auto h-28 w-40 overflow-hidden rounded-xl bg-white ring-4 ring-primary/10">
            <img src={imageUrl} alt="Photo being analyzed" className="h-full w-full object-cover" />
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">Scanning this photo…</p>
        </div>
      )}

      <p className="mt-7 flex items-center gap-1.5 text-[11px] text-ink-muted">
        <ShieldCheck className="h-3.5 w-3.5" />
        Please keep this page open.
      </p>
    </div>,
    document.body
  )
}
