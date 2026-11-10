import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Calendar, User, MapPin, Scan, Sparkles, Download, ImagePlus, X, Send, CheckCircle2, Pencil, XCircle, ClipboardCheck,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { SEVERITY_COLORS, severityLabel } from '../lib/severity'
import { generateReportPdf } from '../lib/generateReportPdf'
import { CITY_BOUNDS } from '../lib/mapConfig'
import { isInsideIligan } from '../lib/geo'
import ImageLightbox from '../components/ImageLightbox'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Textarea } from '../components/ui/Field'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import BaseTiles from '../components/map/BaseTiles'
import CoverageBoundary from '../components/map/CoverageBoundary'
import { cn } from '../components/ui/utils'

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function formatHazardType(type) {
  if (!type) return ''
  return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function CorrectionMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng)
    },
  })
  return position ? <Marker position={position} /> : null
}

const MAX_PHOTOS = 5

export default function InspectionDetail() {
  const { reportId } = useParams()
  const { user } = useAuth()

  const [report, setReport] = useState(null)
  const [detection, setDetection] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [findings, setFindings] = useState('')
  const [decision, setDecision] = useState(null)
  const [editingFindings, setEditingFindings] = useState(false)
  const [updatingFindings, setUpdatingFindings] = useState(false)
  const [newPhotoFiles, setNewPhotoFiles] = useState([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([])
  const [correctingLocation, setCorrectingLocation] = useState(false)
  const [correctedPosition, setCorrectedPosition] = useState(null)
  const [savingLocation, setSavingLocation] = useState(false)

  async function fetchAll() {
    const [{ data: reportData }, { data: detectionData }, { data: assignmentData }, { data: photosData }] =
      await Promise.all([
        supabase
          .from('hazard_reports')
          .select('*, reporter:users!hazard_reports_user_id_fkey(username, address), hazard_images(image_id, image_url)')
          .eq('report_id', reportId)
          .single(),
        supabase
          .from('hazard_detection_results')
          .select('*')
          .eq('report_id', reportId)
          .order('detected_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('inspector_assignments')
          .select('*')
          .eq('report_id', reportId)
          .eq('assigned_to', user.id)
          .maybeSingle(),
        supabase.from('inspection_photos').select('*').eq('report_id', reportId).order('uploaded_at'),
      ])

    setReport(reportData)
    if (reportData?.verified_latitude && reportData?.verified_longitude) {
      setCorrectedPosition({ lat: Number(reportData.verified_latitude), lng: Number(reportData.verified_longitude) })
    }
    setDetection(detectionData)
    setAssignment(assignmentData)
    setPhotos(photosData || [])
  }

  useEffect(() => {
    fetchAll().finally(() => setLoading(false))
  }, [reportId, user])

  async function handleAccept() {
    setAccepting(true)
    try {
      const { error } = await supabase
        .from('inspector_assignments')
        .update({ assignment_status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('assignment_id', assignment.assignment_id)

      if (error) throw error
      toast.success('Assignment accepted')
      await fetchAll()
    } catch (err) {
      toast.error(err.message || 'Could not accept assignment')
    } finally {
      setAccepting(false)
    }
  }

  function handlePhotoSelect(e) {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return

    const remaining = MAX_PHOTOS - newPhotoFiles.length
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos per upload`)
      e.target.value = ''
      return
    }
    const filesToAdd = newFiles.slice(0, remaining)
    setNewPhotoFiles((prev) => [...prev, ...filesToAdd])
    setNewPhotoPreviews((prev) => [...prev, ...filesToAdd.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeNewPhoto(index) {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleUploadPhotos() {
    if (newPhotoFiles.length === 0) return
    setUploading(true)
    try {
      const uploadedUrls = []
      for (let i = 0; i < newPhotoFiles.length; i++) {
        const file = newPhotoFiles[i]
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${reportId}-${Date.now()}-${i}.${ext}`
        const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(path, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(path)
        uploadedUrls.push(urlData.publicUrl)
      }

      const { error: insertError } = await supabase.from('inspection_photos').insert(
        uploadedUrls.map((url) => ({ report_id: reportId, inspector_id: user.id, photo_url: url }))
      )
      if (insertError) throw insertError

      toast.success('Photos uploaded')
      setNewPhotoFiles([])
      setNewPhotoPreviews([])
      await fetchAll()
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmitFindings() {
    if (!decision) {
      toast.error('Choose whether you recommend approving or rejecting this report')
      return
    }
    if (!findings.trim()) {
      toast.error('Please describe your site inspection findings')
      return
    }
    setSubmitting(true)
    try {
      const { error: assignError } = await supabase
        .from('inspector_assignments')
        .update({
          assignment_status: 'completed',
          completed_at: new Date().toISOString(),
          remarks: findings.trim(),
          inspector_decision: decision,
        })
        .eq('assignment_id', assignment.assignment_id)
      if (assignError) throw assignError

      // Status always becomes "verified" here, regardless of the inspector's
      // own recommendation. The admin makes the actual approve/reject call
      // that determines Hazard Map visibility — this just marks on-site
      // inspection as complete and ready for the admin's review, with the
      // inspector's opinion attached as supporting context (not a decision).
      const { error: reportError } = await supabase
        .from('hazard_reports')
        .update({ status: 'verified', verified_by: user.id, verified_at: new Date().toISOString() })
        .eq('report_id', reportId)
      if (reportError) throw reportError

      toast.success('Verification findings submitted')
      await fetchAll()
    } catch (err) {
      toast.error(err.message || 'Could not submit findings')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmLocation() {
    if (!isInsideIligan(report.latitude, report.longitude)) {
      toast.error('This report is outside Iligan City. Use Correct Location to move it inside the boundary.')
      return
    }
    setSavingLocation(true)
    try {
      const { error } = await supabase
        .from('hazard_reports')
        .update({ verified_latitude: report.latitude, verified_longitude: report.longitude })
        .eq('report_id', reportId)

      if (error) throw error
      toast.success('Location confirmed as accurate')
      setCorrectedPosition({ lat: Number(report.latitude), lng: Number(report.longitude) })
      await fetchAll()
    } catch (err) {
      toast.error(err.message || 'Could not confirm location')
    } finally {
      setSavingLocation(false)
    }
  }

  async function handleSaveCorrectedLocation() {
    if (!correctedPosition) {
      toast.error('Click on the map to pin the correct location first')
      return
    }
    if (!isInsideIligan(correctedPosition.lat, correctedPosition.lng)) {
      toast.error('The corrected location must be inside Iligan City. Move the pin inside the blue boundary.')
      return
    }
    setSavingLocation(true)
    try {
      const { error } = await supabase
        .from('hazard_reports')
        .update({ verified_latitude: correctedPosition.lat, verified_longitude: correctedPosition.lng })
        .eq('report_id', reportId)

      if (error) throw error
      toast.success('Corrected location saved — the admin will use this when approving')
      setCorrectingLocation(false)
      await fetchAll()
    } catch (err) {
      toast.error(err.message || 'Could not save corrected location')
    } finally {
      setSavingLocation(false)
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      await generateReportPdf(report, detection)
    } catch {
      toast.error('Could not generate PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function handleUpdateFindings() {
    if (!decision) {
      toast.error('Choose whether you recommend approving or rejecting this report')
      return
    }
    if (!findings.trim()) {
      toast.error('Findings cannot be empty')
      return
    }
    setUpdatingFindings(true)
    try {
      const { error } = await supabase
        .from('inspector_assignments')
        .update({ remarks: findings.trim(), inspector_decision: decision, updated_at: new Date().toISOString() })
        .eq('assignment_id', assignment.assignment_id)

      if (error) throw error
      toast.success('Findings updated')
      setEditingFindings(false)
      await fetchAll()
    } catch (err) {
      toast.error(err.message || 'Could not update findings')
    } finally {
      setUpdatingFindings(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-9 w-2/3" />
        <LoadingState rows={3} label="Loading assignment…" />
      </div>
    )
  }
  if (!report) {
    return (
      <EmptyState icon={ClipboardCheck} title="Report not found" description="This hazard report may have been deleted." />
    )
  }
  if (!assignment) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Not assigned to you"
        description="This report isn't assigned to you."
      />
    )
  }

  const position = [Number(report.latitude), Number(report.longitude)]
  // The inspector may only move a report to a point inside the service area.
  const correctedOutsideCity = Boolean(
    correctingLocation && correctedPosition && !isInsideIligan(correctedPosition.lat, correctedPosition.lng)
  )
  const images = report.hazard_images || []
  const galleryImages = [
    ...images.map((img) => ({ url: img.image_url, label: "Citizen's Photo" })),
    ...photos.map((p) => ({ url: p.photo_url, label: 'Your Site Photo' })),
  ]

  const sectionTitle = 'flex items-center gap-1.5 text-sm font-semibold text-ink'

  return (
    <div className="space-y-6">
      <Link
        to="/inspector"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <Calendar className="h-3.5 w-3.5" />
              Submitted {formatDate(report.created_at)}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            {report.title || 'Untitled hazard report'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {report.ai_report && (
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? 'Preparing…' : 'Download PDF'}
            </Button>
          )}
        </div>
      </div>

      {/* Assignment status / accept */}
      <Card className="overflow-hidden">
        <div className="border-b border-line-soft bg-gradient-to-r from-primary-light/40 via-white to-secondary-light/30 px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Field Assignment</p>
        </div>
        <div className="p-5">
          {assignment.assignment_status === 'pending' ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">You've been assigned to inspect this hazard on-site.</p>
              <Button variant="gradient" size="sm" icon={CheckCircle2} onClick={handleAccept} disabled={accepting}>
                {accepting ? 'Accepting…' : 'Accept Assignment'}
              </Button>
            </div>
          ) : assignment.assignment_status === 'completed' ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Inspection completed {formatDate(assignment.completed_at)}
                </p>
                {!editingFindings && (
                  <button
                    onClick={() => {
                      setFindings(assignment.remarks || '')
                      setDecision(assignment.inspector_decision || null)
                      setEditingFindings(true)
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit Findings
                  </button>
                )}
              </div>

              {!editingFindings && assignment.inspector_decision && (
                <Badge
                  tone={assignment.inspector_decision === 'approve' ? 'success' : 'danger'}
                  className="mt-2"
                >
                  {assignment.inspector_decision === 'approve' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  You recommended: {assignment.inspector_decision === 'approve' ? 'Approve' : 'Reject'}
                </Badge>
              )}

              {editingFindings ? (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setDecision('approve')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition',
                        decision === 'approve'
                          ? 'border-success bg-success-light/60 text-success'
                          : 'border-line text-ink-soft hover:border-success/30'
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Recommend Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision('reject')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition',
                        decision === 'reject'
                          ? 'border-danger bg-danger-light/60 text-danger'
                          : 'border-line text-ink-soft hover:border-danger/30'
                      )}
                    >
                      <XCircle className="h-4 w-4" />
                      Recommend Reject
                    </button>
                  </div>
                  <Textarea
                    rows={4}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="xs" onClick={handleUpdateFindings} disabled={updatingFindings}>
                      {updatingFindings ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button variant="secondary" size="xs" onClick={() => setEditingFindings(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{assignment.remarks}</p>
              )}
            </div>
          ) : (
            <p className="text-sm font-medium text-info">Assignment accepted — conduct your site inspection below.</p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: citizen's photo + description + reporter */}
        <div className="space-y-5">
          {images.length > 0 && (
            <Card className="p-5">
              <h2 className={cn(sectionTitle, 'mb-3')}>
                Citizen's Photos ({images.length})
              </h2>
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="block w-full overflow-hidden rounded-xl ring-1 ring-line"
              >
                <img
                  src={images[0].image_url}
                  alt=""
                  className="max-h-72 w-full cursor-zoom-in bg-canvas object-contain transition hover:opacity-90"
                />
              </button>
              {images.length > 1 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {images.slice(1).map((img, i) => (
                    <button
                      key={img.image_id}
                      type="button"
                      onClick={() => setLightboxIndex(i + 1)}
                      className="block overflow-hidden rounded-lg ring-1 ring-line"
                    >
                      <img
                        src={img.image_url}
                        alt=""
                        className="h-16 w-full cursor-zoom-in object-cover transition hover:opacity-80"
                      />
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h2 className={sectionTitle}>Citizen's Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{report.description}</p>
          </Card>

          <Card className="p-5">
            <h2 className={sectionTitle}>Reported By</h2>
            <div className="mt-3 space-y-2">
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <User className="h-3.5 w-3.5 text-ink-muted" />
                {report.reporter?.username ?? 'Unknown'}
              </p>
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <MapPin className="h-3.5 w-3.5 text-ink-muted" />
                {report.reporter?.address || 'Not provided'}
              </p>
            </div>
          </Card>

          {detection && (
            <Card className="p-5">
              <h2 className={sectionTitle}>
                <Scan className="h-4 w-4 text-primary" />
                Computer Vision Detection
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: SEVERITY_COLORS[detection.severity_level?.toLowerCase()] || SEVERITY_COLORS.default }}
                >
                  {severityLabel(detection.severity_level)}
                </span>
                <Badge tone="neutral">{formatHazardType(detection.hazard_type)}</Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{detection.detection_notes}</p>
            </Card>
          )}

          {report.ai_report && (
            <Card className="p-5">
              <h2 className={sectionTitle}>
                <Sparkles className="h-4 w-4 text-secondary" />
                AI-Assisted Report
              </h2>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Executive Summary</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{report.ai_report.executive_summary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Recommended Action</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{report.ai_report.recommended_action}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: map + site inspection work */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-ink-soft">
              {correctingLocation ? 'Tap the map to pin the correct location' : 'Reported location'}
            </p>
            {assignment.assignment_status === 'accepted' && !correctingLocation && (
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmLocation}
                  disabled={savingLocation}
                  className="text-xs font-semibold text-success hover:underline disabled:opacity-60"
                >
                  Confirm Accurate
                </button>
                <button
                  onClick={() => setCorrectingLocation(true)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Correct Location
                </button>
              </div>
            )}
            {correctingLocation && (
              <button
                onClick={() => setCorrectingLocation(false)}
                className="text-xs font-semibold text-ink-soft hover:underline"
              >
                Cancel
              </button>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="h-56">
              <MapContainer
                center={correctedPosition || position}
                zoom={16}
                className="leaflet-container"
                zoomControl={false}
                maxBounds={CITY_BOUNDS}
                maxBoundsViscosity={1}
              >
                <BaseTiles />
                <CoverageBoundary />
                {correctingLocation ? (
                  <CorrectionMarker position={correctedPosition} setPosition={setCorrectedPosition} />
                ) : (
                  <Marker position={correctedPosition ? [correctedPosition.lat, correctedPosition.lng] : position} />
                )}
              </MapContainer>
            </div>
          </Card>

          {correctingLocation && correctedOutsideCity && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-xl border border-danger/20 bg-danger-light/60 px-3 py-2.5 text-xs text-danger"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong className="font-semibold">Outside Iligan City.</strong> Move the pin inside the blue boundary —
                corrected locations must stay within Iligan City.
              </span>
            </p>
          )}

          {correctingLocation ? (
            <Button
              variant="gradient"
              size="sm"
              onClick={handleSaveCorrectedLocation}
              disabled={savingLocation || correctedOutsideCity}
              title={correctedOutsideCity ? 'The corrected location must be inside Iligan City' : undefined}
            >
              {savingLocation ? 'Saving…' : 'Save Corrected Location'}
            </Button>
          ) : (
            <p className="flex items-start gap-1.5 text-xs text-ink-soft">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                {correctedPosition ? (
                  <>
                    {correctedPosition.lat.toFixed(5)}, {correctedPosition.lng.toFixed(5)}{' '}
                    <span className="font-medium text-success">
                      {Number(correctedPosition.lat).toFixed(5) === Number(report.latitude).toFixed(5) &&
                      Number(correctedPosition.lng).toFixed(5) === Number(report.longitude).toFixed(5)
                        ? '(confirmed accurate by you)'
                        : '(corrected by you)'}
                    </span>
                  </>
                ) : (
                  `${position[0].toFixed(5)}, ${position[1].toFixed(5)} (not yet confirmed)`
                )}
              </span>
            </p>
          )}

          {assignment.assignment_status !== 'pending' && (
            <>
              {/* Upload inspection photos */}
              <Card className="p-5">
                <h2 className={sectionTitle}>Site Inspection Photos</h2>

                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {photos.map((p, i) => (
                      <button
                        key={p.inspection_photo_id}
                        type="button"
                        onClick={() => setLightboxIndex(images.length + i)}
                        className="block overflow-hidden rounded-lg ring-1 ring-line"
                      >
                        <img
                          src={p.photo_url}
                          alt=""
                          className="aspect-square w-full cursor-zoom-in object-cover transition hover:opacity-80"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {assignment.assignment_status !== 'completed' && (
                  <>
                    {newPhotoPreviews.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {newPhotoPreviews.map((src, i) => (
                          <div key={src} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-line">
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeNewPhoto(i)}
                              aria-label="Remove photo"
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {newPhotoFiles.length < MAX_PHOTOS && (
                        <label
                          htmlFor="inspection-photo-input"
                          className="flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-dashed border-line px-3 py-2 text-xs font-medium text-ink-soft transition hover:border-primary/40 hover:bg-primary-light/30"
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                          Add photos
                        </label>
                      )}
                      <input
                        id="inspection-photo-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      {newPhotoFiles.length > 0 && (
                        <Button variant="primary" size="xs" onClick={handleUploadPhotos} disabled={uploading}>
                          {uploading
                            ? 'Uploading…'
                            : `Upload ${newPhotoFiles.length} photo${newPhotoFiles.length === 1 ? '' : 's'}`}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </Card>

              {/* Submit findings */}
              {assignment.assignment_status !== 'completed' && (
                <Card className="p-5">
                  <h2 className={sectionTitle}>Verification Findings</h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Your recommendation and remarks — the admin makes the final call on whether this goes on the
                    Hazard Map.
                  </p>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setDecision('approve')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition',
                        decision === 'approve'
                          ? 'border-success bg-success-light/60 text-success'
                          : 'border-line text-ink-soft hover:border-success/30'
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Recommend Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision('reject')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition',
                        decision === 'reject'
                          ? 'border-danger bg-danger-light/60 text-danger'
                          : 'border-line text-ink-soft hover:border-danger/30'
                      )}
                    >
                      <XCircle className="h-4 w-4" />
                      Recommend Reject
                    </button>
                  </div>

                  <Textarea
                    rows={4}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder={
                      decision === 'reject'
                        ? 'Explain why — e.g. no road damage found at this location, does not match the photo'
                        : "Describe what you found on-site — does it match the citizen's report? Severity confirmed? Recommended repair?"
                    }
                    className="mt-3"
                  />
                  <Button
                    variant="gradient"
                    size="sm"
                    icon={Send}
                    className="mt-2"
                    onClick={handleSubmitFindings}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting…' : 'Submit Verification'}
                  </Button>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={galleryImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
