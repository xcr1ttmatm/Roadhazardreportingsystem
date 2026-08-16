import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Full-screen image viewer for a gallery of photos.
 * Used on both the Admin and Inspector report pages so every role
 * sees and navigates photos the exact same way.
 *
 * @param {{url: string, label: string}[]} images
 * @param {number} index - currently shown image
 * @param {(newIndex: number) => void} onIndexChange
 * @param {() => void} onClose
 */
export default function ImageLightbox({ images, index, onIndexChange, onClose }) {
  const [zoomed, setZoomed] = useState(false)
  const total = images.length
  const current = images[index]

  function goPrev() {
    setZoomed(false)
    onIndexChange((index - 1 + total) % total)
  }
  function goNext() {
    setZoomed(false)
    onIndexChange((index + 1) % total)
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  if (!current) return null

  return (
    // z-[9999] is deliberate — Leaflet's own map panes/controls use z-index
    // values up into the hundreds, so anything lower gets rendered underneath the map.
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-6" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {total > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="flex max-h-full max-w-full flex-col items-center gap-3">
        <div
          className={`overflow-auto ${
            zoomed ? 'max-h-[85vh] max-w-[90vw]' : 'flex max-h-[75vh] max-w-full items-center justify-center'
          }`}
        >
          <img
            src={current.url}
            alt=""
            onClick={(e) => {
              e.stopPropagation()
              setZoomed((z) => !z)
            }}
            className={
              zoomed
                ? 'w-auto max-w-none cursor-zoom-out rounded-lg'
                : 'max-h-[75vh] max-w-full cursor-zoom-in rounded-lg object-contain'
            }
            style={zoomed ? { width: '160%' } : undefined}
          />
        </div>
        <p className="text-xs text-white/70">
          {current.label} — {index + 1} of {total} · click image to zoom · arrow keys to navigate
        </p>
      </div>
    </div>
  )
}