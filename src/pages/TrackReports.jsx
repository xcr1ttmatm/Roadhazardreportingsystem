import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { MapPin, Calendar, ChevronDown, Trash2, ListChecks, FilePlus, AlertTriangle } from 'lucide-react'
import { hasVerifiedLocation } from '../lib/reportLocation'
import { deleteHazardReport } from '../lib/deleteReport'
import ImageLightbox from '../components/ImageLightbox'
import ReportLocationMap from '../components/map/ReportLocationMap'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import { StatusBadge, SeverityBadge } from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import Modal from '../components/ui/Modal'

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function TrackReports() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkId = searchParams.get('report')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  // Seed directly from the URL so a notification deep link is expanded on the
  // very first paint, without waiting for an effect.
  const [expandedId, setExpandedId] = useState(deepLinkId)
  const [highlightId, setHighlightId] = useState(deepLinkId)
  const [pendingDeepLink, setPendingDeepLink] = useState(deepLinkId)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { images, index } while a photo is open

  // URL → UI sync. React's "adjust state during render" pattern avoids a
  // cascading setState effect and also handles clicks while already on this page.
  if (deepLinkId !== pendingDeepLink) {
    setPendingDeepLink(deepLinkId)
    if (deepLinkId) {
      setExpandedId(deepLinkId)
      setHighlightId(deepLinkId)
    }
  }

  useEffect(() => {
    if (!user) return

    async function fetchReports() {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*, hazard_images(image_id, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) setReports(data)
      setLoading(false)
    }

    fetchReports()
  }, [user])

  // Once the report list is available, drop ?report= so a refresh or back
  // navigation doesn't re-trigger the jump. If the id isn't in the citizen's
  // list (deleted, or not theirs), tell them instead of silently doing nothing.
  useEffect(() => {
    if (loading || !pendingDeepLink) return

    setSearchParams({}, { replace: true })
    if (!reports.some((report) => report.report_id === pendingDeepLink)) {
      toast.error('That report could not be found.')
    }
  }, [loading, pendingDeepLink, reports, setSearchParams])

  // Scroll the highlighted card into view once the list has rendered, then
  // fade the highlight away.
  useEffect(() => {
    if (loading || !highlightId) return

    const scrollTimer = setTimeout(() => {
      document.getElementById(`report-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    const highlightTimer = setTimeout(() => setHighlightId(null), 2600)

    return () => {
      clearTimeout(scrollTimer)
      clearTimeout(highlightTimer)
    }
  }, [loading, highlightId])

  async function handleDelete(report) {
    setDeleting(true)
    try {
      const { error } = await deleteHazardReport(report)
      if (error) throw error
      toast.success('Report deleted')
      setReports((prev) => prev.filter((r) => r.report_id !== report.report_id))
      setConfirmDeleteId(null)
    } catch (err) {
      toast.error(err.message || 'Could not delete report')
    } finally {
      setDeleting(false)
    }
  }

  const deleteTarget = reports.find((report) => report.report_id === confirmDeleteId) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Citizen Portal"
        title="My Reports"
        description="Track the status of hazards you've reported."
        icon={ListChecks}
        actions={
          <Link to="/citizen/report/new" className={buttonClasses({ variant: 'gradient' })}>
            <FilePlus className="h-4 w-4" />
            Submit a Report
          </Link>
        }
      />

      {loading ? (
        <LoadingState rows={4} label="Loading your reports…" />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="You haven't submitted any reports yet"
          description="Spotted a pothole or road damage? Submit your first report with a photo and location."
          action={
            <Link to="/citizen/report/new" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
              <FilePlus className="h-3.5 w-3.5" />
              Submit a report
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isExpanded = expandedId === report.report_id
            const photos = report.hazard_images ?? []
            const thumbnail = photos[0]?.image_url
            // The spot the citizen pinned at submission, plus the inspector's
            // correction when one exists — both are shown so the citizen can
            // verify exactly what was recorded.
            const pinnedPosition = [Number(report.latitude), Number(report.longitude)]
            const verifiedPosition = hasVerifiedLocation(report)
              ? [Number(report.verified_latitude), Number(report.verified_longitude)]
              : null

            return (
              <Card
                key={report.report_id}
                id={`report-${report.report_id}`}
                className={`scroll-mt-24 overflow-hidden transition hover:shadow-float ${
                  highlightId === report.report_id ? 'ring-2 ring-primary/50' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : report.report_id)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3.5 p-3.5 text-left transition hover:bg-canvas/40 sm:p-4"
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-line"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink-muted">
                      <MapPin className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink sm:text-sm">
                      {report.title || 'Untitled hazard report'}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
                      <Calendar className="h-3 w-3" />
                      {formatDate(report.created_at)}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                    <StatusBadge status={report.status} />
                    <SeverityBadge severity={report.severity} />
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-line-soft px-3.5 pb-4 pt-4 sm:px-4">
                    <p className="text-sm leading-relaxed text-ink-soft">{report.description}</p>

                    {photos.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                          Your photos ({photos.length})
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                          {photos.map((photo, i) => (
                            <button
                              key={photo.image_id ?? i}
                              type="button"
                              aria-label={`View photo ${i + 1} of ${photos.length}`}
                              onClick={() =>
                                setLightbox({
                                  images: photos.map((p) => ({ url: p.image_url, label: 'Your photo' })),
                                  index: i,
                                })
                              }
                              className="overflow-hidden rounded-xl ring-1 ring-line transition hover:ring-primary/40"
                            >
                              <img
                                src={photo.image_url}
                                alt=""
                                className="aspect-square w-full cursor-zoom-in object-cover transition hover:opacity-90"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 rounded-xl border border-line-soft bg-canvas/40 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                        Location you pinned
                      </p>

                      <div className="mt-2 flex items-start gap-1.5 text-xs text-ink-soft">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {Number.isFinite(pinnedPosition[0]) && Number.isFinite(pinnedPosition[1]) ? (
                          <span>
                            <span className="font-medium text-ink">
                              {pinnedPosition[0].toFixed(5)}, {pinnedPosition[1].toFixed(5)}
                            </span>
                            <span className="text-ink-muted"> · exact spot you selected when submitting</span>
                          </span>
                        ) : (
                          <span className="text-ink-muted">No coordinates were saved with this report.</span>
                        )}
                      </div>

                      {verifiedPosition && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-success">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            <span className="font-medium">
                              {verifiedPosition[0].toFixed(5)}, {verifiedPosition[1].toFixed(5)}
                            </span>
                            <span className="text-ink-soft"> · corrected by an inspector on-site</span>
                          </span>
                        </div>
                      )}

                      <div className="mt-3">
                        <ReportLocationMap position={pinnedPosition} verifiedPosition={verifiedPosition} />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          Your pin
                        </span>
                        {verifiedPosition && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            Inspector-verified
                          </span>
                        )}
                        <span>Blue outline = Iligan City coverage</span>
                      </div>
                    </div>

                    {report.status === 'rejected' && report.rejection_reason && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-light/70 px-3 py-2.5 text-sm text-danger">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <span className="font-semibold">Reason for rejection: </span>
                          {report.rejection_reason}
                        </span>
                      </div>
                    )}

                    {/* simple status timeline */}
                    <div className="mt-4 space-y-3 border-l-2 border-line-soft pl-4">
                      <TimelineStep label="Submitted" date={report.created_at} done />
                      <TimelineStep
                        label="Verified by inspector"
                        date={report.verified_at}
                        done={!!report.verified_at}
                      />
                      <TimelineStep
                        label={report.status === 'rejected' ? 'Rejected' : 'Approved'}
                        date={report.approved_at}
                        done={!!report.approved_at}
                      />
                    </div>

                    {(report.status === 'pending' || report.status === 'rejected') && (
                      <div className="mt-4 border-t border-line-soft pt-3">
                        <Button
                          variant="secondary-danger"
                          size="xs"
                          icon={Trash2}
                          onClick={() => setConfirmDeleteId(report.report_id)}
                        >
                          Delete Report
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete this report?"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)} loading={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-2.5 rounded-xl bg-danger-light/60 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-xs leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">{deleteTarget?.title || 'Untitled hazard report'}</span> will be
            permanently removed from your reports and the LGU records.
          </p>
        </div>
      </Modal>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onIndexChange={(i) => setLightbox({ ...lightbox, index: i })}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

function TimelineStep({ label, date, done }) {
  return (
    <div className="relative">
      <span
        className={`absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
          done ? 'bg-primary' : 'bg-slate-200'
        }`}
      />
      <p className={`text-sm font-medium ${done ? 'text-ink' : 'text-ink-muted'}`}>{label}</p>
      {date && <p className="text-[11px] text-ink-muted">{formatDate(date)}</p>}
    </div>
  )
}
