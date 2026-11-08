import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './utils'

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ open, onClose, title, description, children, footer, size = 'md', className }) {
  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  // Portaled to the body: the authenticated shell keeps a `transform` from its
  // entrance animation on a page wrapper, which would otherwise anchor this
  // `fixed` overlay to the content column instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'relative w-full animate-scale-in overflow-hidden rounded-2xl border border-line bg-white shadow-float',
          SIZES[size] ?? SIZES.md,
          className
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
            <div>
              {title && <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>}
              {description && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-canvas/50 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
