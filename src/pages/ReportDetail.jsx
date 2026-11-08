import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapContainer, Marker } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Calendar, User, Mail, MapPin, Scan, Sparkles, UserPlus, Download, Send, CheckCircle2, XCircle, IdCard, Home, Undo2, Pencil, Trash2, ImagePlus, ClipboardList, Info,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../lib/severity'
import { generateReportPdf } from '../lib/generateReportPdf'
import { deleteHazardReport } from '../lib/deleteReport'
import { runHazardDetection } from '../lib/hazardDetection'
import { friendlyAiError, invokeWithAiRetry } from '../lib/functionErrors'
import { buildLocalReportDraft } from '../lib/localReportDraft'
import ImageLightbox from '../components/ImageLightbox'
import DetectionBoxes, { DetectionPreview, effectiveShowWeak } from '../components/DetectionBoxes'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Select, Textarea } from '../components/ui/Field'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import BaseTiles from '../components/map/BaseTiles'
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

const ASSIGNMENT_LABELS = {
  pending: 'Pending',
  accepted: 'In Progress',
  completed: 'Completed',
}

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

// Local AI drafts live in localStorage so a temporary Gemini outage never
// leaves the admin with an empty report card. They are always labelled as
// local drafts and are removed as soon as a real AI report is saved.
const AI_DRAFT_PREFIX = 'rhs.ai-draft.'

function readLocalDraft(reportId) {
  try {
    const raw = window.localStorage.getItem(AI_DRAFT_PREFIX + reportId)
    const draft = raw ? JSON.parse(raw) : null
    return draft?.generated_by === 'local_fallback' ? draft : null
  } catch {
    return null
  }
}

function writeLocalDraft(reportId, draft) {
  try {
    window.localStorage.setItem(AI_DRAFT_PREFIX + reportId, JSON.stringify(draft))
  } catch {
    /* localStorage can be unavailable (private mode) — the draft still shows for this session */
  }
}

function clearLocalDraft(reportId) {
  try {
    window.localStorage.removeItem(AI_DRAFT_PREFIX + reportId)
  } catch {
    /* ignore */
  }
}

export default function ReportDetail() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [detection, setDetection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateSeconds, setGenerateSeconds] = useState(0)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [inspectors, setInspectors] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [selectedInspector, setSelectedInspector] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [inspectionPhotos, setInspectionPhotos] = useState([])
  const [showApproveGallery, setShowApproveGallery] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState(null)
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [reassignSelection, setReassignSelection] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showResolvePanel, setShowResolvePanel] = useState(false)
  const [resolvePhotoFiles, setResolvePhotoFiles] = useState([])
  const [resolvePhotoPreviews, setResolvePhotoPreviews] = useState([])
  const [resolvedImages, setResolvedImages] = useState([])
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [showWeakBoxes, setShowWeakBoxes] = useState(false)

  async function fetchReport() {
    const { data, error } = await supabase
      .from('hazard_reports')
      .select('*, reporter:users!hazard_reports_user_id_fkey(username, email, full_name, address), hazard_images(image_id, image_url)')
      .eq('report_id', reportId)
      .single()

    if (error) return null

    // If the AI service was unavailable last time, keep showing the clearly
    // labelled local draft until a real AI report replaces it.
    const draft = data.ai_report ? null : readLocalDraft(reportId)
    const next = draft
      ? { ...data, ai_report: draft, ai_report_generated_at: draft.generated_at }
      : data

    setReport(next)
    return next
  }

  async function fetchLatestDetection() {
    const { data, error } = await supabase
      .from('hazard_detection_results')
      .select('*')
      .eq('report_id', reportId)
      .order('detected_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error) setDetection(data)
  }

  async function fetchInspectors() {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, email')
      .eq('user_type', 'inspector')
      .order('username')

    if (!error) setInspectors(data)
  }

  async function fetchAssignment() {
    const { data, error } = await supabase
      .from('inspector_assignments')
      .select('*, inspector:users!inspector_assignments_assigned_to_fkey(username, email)')
      .eq('report_id', reportId)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error) setAssignment(data)
  }

  async function fetchInspectionPhotos() {
    const { data, error } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('report_id', reportId)
      .order('uploaded_at')

    if (!error) setInspectionPhotos(data)
  }

  useEffect(() => {
    Promise.all([
      fetchReport(),
      fetchLatestDetection(),
      fetchInspectors(),
      fetchAssignment(),
      fetchInspectionPhotos(),
      fetchResolvedImages(),
      ]).finally(
        () => setLoading(false)
      )
  }, [reportId])

  // Shows the admin how long the AI has been working, so a slow request is
  // never just an unexplained spinner.
  useEffect(() => {
    if (!generating) return

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setGenerateSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [generating])

  async function handleRunDetection() {
    if (!report?.hazard_images?.[0]?.image_url) {
      toast.error('This report has no image to analyze')
      return
    }

    setDetecting(true)
    let loadingToast = toast.loading('Running your trained model (the first run downloads it, so it can take a moment)...')
    try {
      const { source, detection: result, fallbackReason } = await runHazardDetection(report, supabase, {
        onStatus: (stage) => {
          if (stage === 'fallback') toast.loading('Using Gemini for this one...', { id: loadingToast })
        },
      })
      toast.dismiss(loadingToast)
      loadingToast = null

      if (source === 'yolov8_local') {
        toast.success('Detected with your trained YOLOv8 model')
      } else {
        toast.success('Detected with Gemini (fallback)')
        if (fallbackReason) toast(fallbackReason, { icon: 'ℹ️', duration: 12000 })
      }
      setDetection(result)
      await fetchReport()
    } catch (err) {
      if (loadingToast) toast.dismiss(loadingToast)
      console.error(err)
      toast.error(err.message || 'Detection failed')
    } finally {
      setDetecting(false)
    }
  }

  async function handleGenerateReport() {
    if (!detection) {
      toast.error('Run Computer Vision Detection first')
      return
    }

    setGenerating(true)
    setGenerateSeconds(0)
    const previousGeneratedAt = report.ai_report_generated_at || null
    try {
      const { data, error, friendlyError } = await invokeWithAiRetry(
        () =>
          supabase.functions.invoke('generate-report', {
            body: {
              reportId: report.report_id,
              title: report.title,
              description: report.description,
              hazardType: detection.hazard_type,
              severityLevel: detection.severity_level,
              confidenceScore: detection.confidence_score,
              detectionNotes: detection.detection_notes,
              latitude: report.latitude,
              longitude: report.longitude,
              reporterUsername: report.reporter?.username,
            },
            // Never let a stalled request hang the page for minutes.
            timeout: 60_000,
          }),
        // No automatic retry: if it fails, show the local draft immediately
        // instead of doubling the wait with a second attempt.
        { attempts: 1 }
      )

      if (error) throw new Error(friendlyError || 'Report generation failed')
      if (data?.error) throw new Error(friendlyAiError(data.error))

      clearLocalDraft(report.report_id)
      toast.success('AI report generated')
      await fetchReport()
    } catch (err) {
      console.error(err)

      // The function may have saved the report right before the request timed
      // out, so re-read the row before assuming failure.
      const saved = await fetchReport()
      const savedReport = saved?.ai_report
      if (savedReport && savedReport.generated_by !== 'local_fallback') {
        if (saved.ai_report_generated_at !== previousGeneratedAt) {
          toast.success('AI report generated')
        } else {
          toast.error('The AI could not regenerate the report. The previous version is still shown.')
        }
        return
      }

      // Gemini is unavailable — build a clearly labelled local draft from data
      // the app already has, so the admin still has something to work with.
      const draft = buildLocalReportDraft({ report, detection })
      writeLocalDraft(report.report_id, draft)
      setReport((current) => ({
        ...(current || report),
        ai_report: draft,
        ai_report_generated_at: draft.generated_at,
      }))

      toast.success('Local draft ready — the AI was unavailable, so this draft uses the report data.', {
        duration: 10000,
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      await generateReportPdf(report, detection)
    } catch (err) {
      console.error(err)
      toast.error('Could not generate PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function handleAssignInspector() {
    if (!selectedInspector) {
      toast.error('Choose an inspector first')
      return
    }

    setAssigning(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase.from('inspector_assignments').insert({
        report_id: report.report_id,
        assigned_to: selectedInspector,
        assigned_by: user.id,
      })

      if (error) throw error

      toast.success('Inspector assigned')
      setSelectedInspector('')
      await fetchAssignment()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not assign inspector')
    } finally {
      setAssigning(false)
    }
  }

  function openApproveGallery() {
    const allImages = [
      ...(report.hazard_images || []).map((img) => img.image_url),
      ...inspectionPhotos.map((p) => p.photo_url),
    ]
    setSelectedImageUrl(report.featured_image_url || allImages[0] || null)
    setShowApproveGallery(true)
  }

  async function handleConfirmApprove() {
    setDecisionLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const updates = {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        featured_image_url: selectedImageUrl,
      }

      // If the inspector corrected the location on-site, finalize it as the
      // official location now that the report is being approved.
      if (report.verified_latitude && report.verified_longitude) {
        updates.latitude = report.verified_latitude
        updates.longitude = report.verified_longitude
      }

      const { error } = await supabase.from('hazard_reports').update(updates).eq('report_id', report.report_id)

      if (error) throw error
      toast.success('Report approved — now visible on the public Hazard Map')
      setShowApproveGallery(false)
      await fetchReport()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not approve report')
    } finally {
      setDecisionLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      toast.error('Please give a reason so the citizen understands why')
      return
    }

    setDecisionLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('hazard_reports')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('report_id', report.report_id)

      if (error) throw error
      toast.success('Report rejected')
      setShowRejectForm(false)
      setRejectionReason('')
      await fetchReport()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not reject report')
    } finally {
      setDecisionLoading(false)
    }
  }

  // Reverts an approve/reject/resolved decision back to a sensible earlier
  // state, for when an admin clicks the wrong button by accident.
  async function handleUndoDecision() {
    setDecisionLoading(true)
    try {
      let revertTo = 'pending'
      if (report.status === 'resolved') revertTo = 'approved'
      else if (report.verified_at) revertTo = 'verified'
      else if (report.ai_report || detection) revertTo = 'under_review'

      const updates = {
        status: revertTo,
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
      }
      if (revertTo !== 'approved') {
        updates.resolved_by = null
        updates.resolved_at = null
      }

      const { error } = await supabase.from('hazard_reports').update(updates).eq('report_id', report.report_id)
      if (error) throw error
      toast.success('Decision undone')
      await fetchReport()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not undo decision')
    } finally {
      setDecisionLoading(false)
    }
  }

  const MAX_RESOLVE_PHOTOS = 5

  function handleResolvePhotoSelect(e) {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return

    const remaining = MAX_RESOLVE_PHOTOS - resolvePhotoFiles.length
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_RESOLVE_PHOTOS} photos allowed`)
      e.target.value = ''
      return
    }
    const filesToAdd = newFiles.slice(0, remaining)
    setResolvePhotoFiles((prev) => [...prev, ...filesToAdd])
    setResolvePhotoPreviews((prev) => [...prev, ...filesToAdd.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeResolvePhoto(index) {
    setResolvePhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setResolvePhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function fetchResolvedImages() {
    const { data, error } = await supabase
      .from('resolved_images')
      .select('*')
      .eq('report_id', reportId)
      .order('uploaded_at')

    if (!error) setResolvedImages(data || [])
  }

  async function handleMarkResolved() {
    setDecisionLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const uploadedUrls = []
      for (let i = 0; i < resolvePhotoFiles.length; i++) {
        const file = resolvePhotoFiles[i]
        const ext = file.name.split('.').pop()
        const path = `${user.id}/resolved-${report.report_id}-${Date.now()}-${i}.${ext}`
        const { error: uploadError } = await supabase.storage.from('hazard-images').upload(path, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('hazard-images').getPublicUrl(path)
        uploadedUrls.push(urlData.publicUrl)
      }

      const { error } = await supabase
        .from('hazard_reports')
        .update({
          status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          // Kept in sync as a quick "primary after photo" pointer for places
          // (like the PDF export) that just want one representative image —
          // the full set lives in resolved_images below.
          resolved_image_url: uploadedUrls[0] || null,
        })
        .eq('report_id', report.report_id)

      if (error) throw error

      if (uploadedUrls.length > 0) {
        const { error: insertError } = await supabase
          .from('resolved_images')
          .insert(uploadedUrls.map((url) => ({ report_id: report.report_id, image_url: url })))
        if (insertError) throw insertError
      }

      toast.success('Marked as resolved')
      setShowResolvePanel(false)
      setResolvePhotoFiles([])
      setResolvePhotoPreviews([])
      await Promise.all([fetchReport(), fetchResolvedImages()])
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not mark as resolved')
    } finally {
      setDecisionLoading(false)
    }
  }

  async function handleCancelAssignment() {
    setReassigning(true)
    try {
      const { error } = await supabase.from('inspector_assignments').delete().eq('assignment_id', assignment.assignment_id)
      if (error) throw error
      toast.success('Assignment cancelled')
      setAssignment(null)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not cancel assignment')
    } finally {
      setReassigning(false)
    }
  }

  async function handleReassignInspector() {
    if (!reassignSelection) {
      toast.error('Choose a new inspector first')
      return
    }
    setReassigning(true)
    try {
      const { error } = await supabase
        .from('inspector_assignments')
        .update({
          assigned_to: reassignSelection,
          assignment_status: 'pending',
          accepted_at: null,
          completed_at: null,
          remarks: null,
        })
        .eq('assignment_id', assignment.assignment_id)

      if (error) throw error
      toast.success('Inspector reassigned')
      setReassignSelection('')
      await fetchAssignment()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not reassign inspector')
    } finally {
      setReassigning(false)
    }
  }

  async function handleSaveDescription() {
    if (!descriptionDraft.trim()) {
      toast.error('Description cannot be empty')
      return
    }
    setSavingDescription(true)
    try {
      const { error } = await supabase
        .from('hazard_reports')
        .update({ description: descriptionDraft.trim() })
        .eq('report_id', report.report_id)

      if (error) throw error
      toast.success('Description updated')
      setEditingDescription(false)
      await fetchReport()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not update description')
    } finally {
      setSavingDescription(false)
    }
  }


  async function handleDeleteReport() {
    if (!deleteReason.trim()) {
      toast.error('Please give a reason so the citizen understands why')
      return
    }
    setDeleting(true)
    try {
      const { error } = await deleteHazardReport(report, { notifyUser: true, reason: deleteReason.trim() })
      if (error) throw error
      toast.success('Report deleted')
      navigate('/admin/reports')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not delete report')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-9 w-2/3" />
        <LoadingState rows={3} label="Loading report…" />
      </div>
    )
  }
  if (!report) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Report not found"
        description="This hazard report may have been deleted."
      />
    )
  }

  const hasCorrectedLocation = report.verified_latitude && report.verified_longitude
  const position = hasCorrectedLocation
    ? [Number(report.verified_latitude), Number(report.verified_longitude)]
    : [Number(report.latitude), Number(report.longitude)]
  const images = report.hazard_images || []
  const galleryImages = [
    ...images.map((img) => ({ url: img.image_url, label: "Citizen's Photo", imageId: img.image_id })),
    ...inspectionPhotos.map((p) => ({ url: p.photo_url, label: "Inspector's Photo" })),
    ...resolvedImages.map((img) => ({ url: img.image_url, label: 'After Repair' })),
  ]

  // Which photo the detection was run on (the report's first photo, unless it has been replaced).
  const detectedIndex = Math.max(0, images.findIndex((img) => img.image_id === detection?.image_id))
  const detectedImage = images[detectedIndex]

  const sectionTitle = 'flex items-center gap-1.5 text-sm font-semibold text-ink'

  return (
    <div className="space-y-6">
      <Link
        to="/admin/reports"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
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

      {/* Decision */}
      <Card className="overflow-hidden">
        <div className="border-b border-line-soft bg-gradient-to-r from-primary-light/40 via-white to-secondary-light/30 px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">LGU Decision</p>
        </div>
        <div className="p-5">
          {report.status === 'rejected' ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-danger">
                  <XCircle className="h-4 w-4" />
                  Rejected
                </p>
                <p className="mt-1 text-sm text-ink-soft">Reason: {report.rejection_reason}</p>
              </div>
              <Button variant="secondary" size="xs" icon={Undo2} onClick={handleUndoDecision} disabled={decisionLoading}>
                Undo
              </Button>
            </div>
          ) : report.status === 'resolved' ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" />
                Resolved — hazard has been repaired
              </p>
              <Button variant="secondary" size="xs" icon={Undo2} onClick={handleUndoDecision} disabled={decisionLoading}>
                Undo
              </Button>
            </div>
          ) : report.status === 'approved' ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Approved — visible on the public Hazard Map
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="xs"
                    icon={CheckCircle2}
                    onClick={() => setShowResolvePanel((s) => !s)}
                    disabled={decisionLoading}
                  >
                    Mark as Resolved
                  </Button>
                  <Button variant="secondary" size="xs" icon={Undo2} onClick={handleUndoDecision} disabled={decisionLoading}>
                    Undo
                  </Button>
                </div>
              </div>

              {showResolvePanel && (
                <div className="mt-4 rounded-xl border border-line bg-canvas/60 p-4">
                  <p className="text-xs font-medium text-ink-soft">
                    Optional — upload up to {MAX_RESOLVE_PHOTOS} photos of the repaired road. These show as the
                    "After" photos on the Hazard Map.
                  </p>

                  {resolvePhotoPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {resolvePhotoPreviews.map((src, i) => (
                        <div key={src} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-line">
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeResolvePhoto(i)}
                            aria-label="Remove photo"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 transition group-hover:opacity-100"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {resolvePhotoFiles.length < MAX_RESOLVE_PHOTOS && (
                    <label
                      htmlFor="resolve-photo"
                      className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-white px-4 py-6 text-center transition hover:border-success/50 hover:bg-success-light/20"
                    >
                      <ImagePlus className="h-6 w-6 text-ink-muted" />
                      <span className="text-xs text-ink-soft">
                        {resolvePhotoFiles.length === 0
                          ? 'Click to add after-repair photos'
                          : `Add more (${MAX_RESOLVE_PHOTOS - resolvePhotoFiles.length} remaining)`}
                      </span>
                    </label>
                  )}
                  <input
                    id="resolve-photo"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleResolvePhotoSelect}
                    className="hidden"
                  />

                  <div className="mt-3 flex gap-2">
                    <Button variant="success" size="sm" onClick={handleMarkResolved} disabled={decisionLoading}>
                      {decisionLoading ? 'Saving…' : 'Confirm Resolved'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowResolvePanel(false)
                        setResolvePhotoFiles([])
                        setResolvePhotoPreviews([])
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-ink">Decision</h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                Approve to publish this hazard on the public map, or reject with a reason.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="success" size="sm" icon={CheckCircle2} onClick={openApproveGallery} disabled={decisionLoading}>
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={() => setShowRejectForm((s) => !s)}
                  disabled={decisionLoading}
                >
                  Reject
                </Button>
              </div>

              {showRejectForm && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection — this will be shown to the citizen (e.g. spam, duplicate report, not a road hazard)"
                  />
                  <Button variant="danger" size="sm" onClick={handleReject} disabled={decisionLoading}>
                    {decisionLoading ? 'Submitting…' : 'Confirm Rejection'}
                  </Button>
                </div>
              )}

              {showApproveGallery && (
                <div className="mt-4 rounded-xl border border-line bg-canvas/60 p-4">
                  <p className="text-xs font-medium text-ink-soft">
                    Choose the best photo to represent this hazard on the public Hazard Map:
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {[...(report.hazard_images || []).map((img) => img.image_url), ...inspectionPhotos.map((p) => p.photo_url)].map(
                      (url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setSelectedImageUrl(url)}
                          className={cn(
                            'aspect-square overflow-hidden rounded-xl border-2 transition',
                            selectedImageUrl === url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-line'
                          )}
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </button>
                      )
                    )}
                  </div>
                  {report.verified_latitude && report.verified_longitude && (
                    <p className="mt-3 rounded-lg bg-info-light/60 px-3 py-2 text-xs text-info">
                      The inspector corrected this report's location on-site — that corrected pin will be used
                      as the official location once approved.
                    </p>
                  )}
                  <Button
                    variant="success"
                    size="sm"
                    className="mt-3"
                    onClick={handleConfirmApprove}
                    disabled={decisionLoading || !selectedImageUrl}
                  >
                    {decisionLoading ? 'Approving…' : 'Confirm Approval'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: photo + description */}
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
                  className="max-h-80 w-full cursor-zoom-in bg-canvas object-contain transition hover:opacity-90"
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

          {inspectionPhotos.length > 0 && (
            <Card className="p-5">
              <h2 className={cn(sectionTitle, 'mb-3')}>
                Inspector's Site Photos ({inspectionPhotos.length})
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {inspectionPhotos.map((p, i) => (
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
            </Card>
          )}

          {resolvedImages.length > 0 && (
            <Card className="border-success/20 bg-gradient-to-br from-success-light/40 via-white to-white p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-success">
                After Repair Photos ({resolvedImages.length})
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {resolvedImages.map((img, i) => (
                  <button
                    key={img.resolved_image_id}
                    type="button"
                    onClick={() => setLightboxIndex(images.length + inspectionPhotos.length + i)}
                    className="block overflow-hidden rounded-lg ring-1 ring-line"
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      className="aspect-square w-full cursor-zoom-in object-cover transition hover:opacity-80"
                    />
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className={sectionTitle}>Description</h2>
              {!editingDescription && (
                <button
                  onClick={() => {
                    setDescriptionDraft(report.description)
                    setEditingDescription(true)
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>

            {editingDescription ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  rows={4}
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="xs" onClick={handleSaveDescription} disabled={savingDescription}>
                    {savingDescription ? 'Saving…' : 'Save'}
                  </Button>
                  <Button variant="secondary" size="xs" onClick={() => setEditingDescription(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{report.description}</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className={sectionTitle}>Reported By</h2>
            <div className="mt-3 space-y-2">
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <IdCard className="h-3.5 w-3.5 text-ink-muted" />
                {report.reporter?.full_name || 'Not provided'}
              </p>
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <User className="h-3.5 w-3.5 text-ink-muted" />
                {report.reporter?.username ?? 'Unknown'}
              </p>
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <Mail className="h-3.5 w-3.5 text-ink-muted" />
                {report.reporter?.email ?? '—'}
              </p>
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <Home className="h-3.5 w-3.5 text-ink-muted" />
                {report.reporter?.address || 'Not provided'}
              </p>
            </div>
          </Card>

          {/* AI-Assisted Report */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className={sectionTitle}>
                <Sparkles className="h-4 w-4 text-secondary" />
                AI-Assisted Report
              </h2>
              <Button
                variant="primary"
                size="xs"
                onClick={handleGenerateReport}
                disabled={generating || !detection}
                title={!detection ? 'Run Computer Vision Detection first' : ''}
              >
                {generating ? 'Drafting…' : report.ai_report ? 'Regenerate' : 'Generate'}
              </Button>
            </div>

            {generating && (
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-primary" />
                Drafting… {generateSeconds}s elapsed (usually under 15 seconds).
              </div>
            )}

            {report.ai_report ? (
              <div className="mt-3 space-y-3">
                {report.ai_report.generated_by === 'local_fallback' && (
                  <div className="flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2 text-xs leading-relaxed text-ink-soft">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    <span>
                      This is a <span className="font-semibold text-ink">local draft</span> built from the
                      report and detection data because the AI service was unavailable. Click{' '}
                      <span className="font-semibold text-ink">Regenerate</span> to try the AI again.
                    </span>
                  </div>
                )}
                <ReportSection label="Executive Summary" text={report.ai_report.executive_summary} />
                <ReportSection label="Hazard Description" text={report.ai_report.hazard_description} />
                <ReportSection label="Severity Assessment" text={report.ai_report.severity_assessment} />
                <ReportSection label="Recommended Action" text={report.ai_report.recommended_action} />
                <p className="text-xs text-ink-muted">
                  {report.ai_report.generated_by === 'local_fallback' ? 'Draft created' : 'Generated'}{' '}
                  {formatDate(report.ai_report_generated_at)}
                </p>
              </div>
            ) : (
              !generating && (
                <p className="mt-2 text-sm text-ink-muted">
                  {detection
                    ? 'Not generated yet. Click Generate to draft a formal report.'
                    : 'Run Computer Vision Detection first, then generate the report.'}
                </p>
              )
            )}
          </Card>
        </div>

        {/* Right: map + detection + next steps */}
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="h-64">
              <MapContainer center={position} zoom={16} className="leaflet-container" zoomControl={false}>
                <BaseTiles />
                <Marker position={position} />
              </MapContainer>
            </div>
            <div className="flex items-start gap-1.5 border-t border-line-soft px-4 py-3 text-xs text-ink-soft">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {position[0].toFixed(5)}, {position[1].toFixed(5)}
              {hasCorrectedLocation ? (
                <span className="font-medium text-success">(inspector-verified location)</span>
              ) : (
                <span className="text-ink-muted">(citizen-reported location — not yet verified by inspector)</span>
              )}
            </div>
          </Card>

          {/* Computer Vision Detection */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className={sectionTitle}>
                <Scan className="h-4 w-4 text-primary" />
                Computer Vision Detection
              </h2>
              <Button variant="primary" size="xs" onClick={handleRunDetection} disabled={detecting}>
                {detecting ? 'Analyzing…' : detection ? 'Re-run' : 'Run Detection'}
              </Button>
            </div>

            {detection ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: SEVERITY_COLORS[detection.severity_level?.toLowerCase()] || SEVERITY_COLORS.default }}
                  >
                    {SEVERITY_LABELS[detection.severity_level?.toLowerCase()] || detection.severity_level}
                  </span>
                  <Badge tone="neutral">{formatHazardType(detection.hazard_type)}</Badge>
                  <span className="ml-auto text-xs text-ink-muted">
                    {Number(detection.confidence_score).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink-soft">{detection.detection_notes}</p>
                <DetectionPreview
                  detection={detection}
                  imageUrl={detectedImage?.image_url}
                  showWeak={showWeakBoxes}
                  onShowWeakChange={setShowWeakBoxes}
                  onOpen={() => setLightboxIndex(detectedIndex)}
                />
                <p className="text-xs text-ink-muted">
                  Analyzed {formatDate(detection.detected_at)} ·{' '}
                  {detection.detection_source === 'yolov8_local' ? (
                    <span className="font-medium text-primary">Trained YOLOv8 model</span>
                  ) : (
                    <span>Gemini AI (fallback)</span>
                  )}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                Not analyzed yet. Run detection to identify the hazard type and severity.
              </p>
            )}
          </Card>

          {/* Assign Inspector */}
          <Card className="p-5">
            <h2 className={sectionTitle}>
              <UserPlus className="h-4 w-4 text-primary" />
              Inspector Assignment
            </h2>

            {assignment ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-ink-soft">
                  Assigned to <span className="font-semibold text-ink">{assignment.inspector?.username}</span>
                </p>
                <p className="text-xs text-ink-muted">{assignment.inspector?.email}</p>
                <Badge tone={assignment.assignment_status === 'completed' ? 'success' : assignment.assignment_status === 'accepted' ? 'blue' : 'neutral'} className="capitalize">
                  {ASSIGNMENT_LABELS[assignment.assignment_status] ?? assignment.assignment_status}
                </Badge>
                <p className="text-xs text-ink-muted">Assigned {formatDate(assignment.assigned_at)}</p>

                {assignment.assignment_status === 'completed' && assignment.remarks && (
                  <div className="mt-3 rounded-xl bg-canvas/70 p-3">
                    {assignment.inspector_decision && (
                      <Badge
                        tone={assignment.inspector_decision === 'approve' ? 'success' : 'danger'}
                        className="mb-2"
                      >
                        {assignment.inspector_decision === 'approve' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Inspector recommends: {assignment.inspector_decision === 'approve' ? 'Approve' : 'Reject'}
                      </Badge>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                      Inspector's Findings
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{assignment.remarks}</p>
                    {assignment.completed_at && (
                      <p className="mt-1.5 text-xs text-ink-muted">
                        Submitted {formatDate(assignment.completed_at)}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] italic text-ink-muted">
                      This is a supporting recommendation only — your Approve/Reject decision below determines
                      Hazard Map visibility.
                    </p>
                  </div>
                )}

                {assignment.assignment_status !== 'completed' && (
                  <div className="mt-3 space-y-2 border-t border-line-soft pt-3">
                    <div className="flex gap-2">
                      <Select
                        value={reassignSelection}
                        onChange={(e) => setReassignSelection(e.target.value)}
                        className="flex-1 text-xs"
                      >
                        <option value="">Reassign to...</option>
                        {inspectors
                          .filter((i) => i.user_id !== assignment.assigned_to)
                          .map((i) => (
                            <option key={i.user_id} value={i.user_id}>
                              {i.username}
                            </option>
                          ))}
                      </Select>
                      <Button variant="primary" size="xs" onClick={handleReassignInspector} disabled={reassigning}>
                        Reassign
                      </Button>
                    </div>
                    <button
                      onClick={handleCancelAssignment}
                      disabled={reassigning}
                      className="text-xs font-semibold text-danger hover:underline disabled:opacity-60"
                    >
                      Cancel Assignment
                    </button>
                  </div>
                )}
              </div>
            ) : inspectors.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                No inspector accounts yet.{' '}
                <Link to="/admin/inspectors" className="font-semibold text-primary hover:underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="mt-3 flex gap-2">
                <Select
                  value={selectedInspector}
                  onChange={(e) => setSelectedInspector(e.target.value)}
                  className="flex-1"
                >
                  <option value="">Select an inspector...</option>
                  {inspectors.map((i) => (
                    <option key={i.user_id} value={i.user_id}>
                      {i.username}
                    </option>
                  ))}
                </Select>
                <Button variant="primary" size="xs" icon={Send} onClick={handleAssignInspector} disabled={assigning}>
                  {assigning ? 'Assigning…' : 'Assign'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Danger zone */}
      <Card className="border-danger/20 bg-gradient-to-br from-danger-light/40 via-white to-white p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-danger">
          <Trash2 className="h-4 w-4" />
          Danger Zone
        </h2>
        {confirmDelete ? (
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-semibold text-danger">
              Reason for deletion (the citizen will see this)
            </label>
            <Textarea
              rows={2}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. duplicate report, spam, not an actual road hazard"
            />
            <div className="flex gap-2">
              <Button variant="danger" size="xs" onClick={handleDeleteReport} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => {
                  setConfirmDelete(false)
                  setDeleteReason('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary-danger"
            size="sm"
            icon={Trash2}
            className="mt-2"
            onClick={() => setConfirmDelete(true)}
          >
            Delete This Report
          </Button>
        )}
      </Card>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={galleryImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          renderOverlay={(image) =>
            image.imageId && image.imageId === detection?.image_id && detection?.detections?.length ? (
              <DetectionBoxes
                detections={detection.detections}
                showWeak={effectiveShowWeak(detection.detections, showWeakBoxes)}
              />
            ) : null
          }
        />
      )}
    </div>
  )
}

function ReportSection({ label, text }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
    </div>
  )
}
