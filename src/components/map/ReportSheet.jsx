import { useState } from 'react'
import { Calendar, Images, Wrench } from 'lucide-react'
import Modal from '../ui/Modal'
import { severityColor, severityLabel } from '../../lib/severity'
import { getBeforeAfterImages } from '../../lib/reportImages'

function formatDate(dateString) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Phone-sized hazard preview.
 *
 * Leaflet clips popups to the map box, and on a phone the map (55vh) is shorter
 * than a report card - so the photo used to hang off the top and could not be
 * tapped. This renders the same card in a bottom sheet portaled to the body,
 * outside the map, so everything fits and the photo is always reachable.
 *
 * Tapping the photo hands off to the shared full-screen ImageLightbox.
 */
export default function ReportSheet({ report, onClose, onOpenLightbox }) {
  const { before, after } = getBeforeAfterImages(report)
  const hasBoth = report.status === 'resolved' && before.length > 0 && after.length > 0
  const [showingAfter, setShowingAfter] = useState(true)

  const activeSet = hasBoth ? (showingAfter ? after : before) : before.length > 0 ? before : after
  const photoCount = before.length + after.length

  function handlePhotoClick() {
    if (activeSet.length === 0) return
    const combined = [...before, ...after]
    const startIndex = hasBoth && showingAfter ? before.length : 0
    onOpenLightbox(combined, startIndex)
  }

  const approved = formatDate(report.approved_at)
  const repaired = formatDate(report.resolved_at)

  return (
    <Modal
      open
      onClose={onClose}
      title={report.title || 'Road hazard'}
      className="sm:max-w-md"
    >
      <div className="space-y-3">
        {activeSet.length > 0 && (
          <div>
            <button
              type="button"
              onClick={handlePhotoClick}
              className="group relative block w-full overflow-hidden rounded-xl bg-canvas ring-1 ring-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={`View ${photoCount === 1 ? 'photo' : `${photoCount} photos`} full screen`}
            >
              <img
                src={activeSet[0].url}
                alt=""
                className="max-h-[38dvh] w-full object-contain transition group-hover:opacity-95"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-[11px] font-semibold text-white">
                <Images className="h-3.5 w-3.5" />
                {photoCount > 1 ? `Tap to view all ${photoCount} photos` : 'Tap to view full screen'}
              </span>
            </button>

            {hasBoth && (
              <div className="mt-2 flex overflow-hidden rounded-lg border border-line text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setShowingAfter(false)}
                  className={`min-h-[36px] flex-1 transition ${!showingAfter ? 'bg-primary text-white' : 'bg-white text-ink-soft'}`}
                >
                  Before ({before.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowingAfter(true)}
                  className={`min-h-[36px] flex-1 transition ${showingAfter ? 'bg-success text-white' : 'bg-white text-ink-soft'}`}
                >
                  After ({after.length})
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {report.status === 'resolved' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold text-white">
              <Wrench className="h-3 w-3" />
              Resolved
            </span>
          ) : (
            report.severity && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-soft ring-1 ring-line">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: severityColor(report.severity) }}
                />
                {severityLabel(report.severity)}
              </span>
            )
          )}

          {approved && (
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
              <Calendar className="h-3 w-3" />
              Approved {approved}
            </span>
          )}

          {report.status === 'resolved' && repaired && (
            <span className="inline-flex items-center gap-1 text-[11px] text-success">
              <Calendar className="h-3 w-3" />
              Repaired {repaired}
            </span>
          )}
        </div>

        {report.description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{report.description}</p>
        )}
      </div>
    </Modal>
  )
}
