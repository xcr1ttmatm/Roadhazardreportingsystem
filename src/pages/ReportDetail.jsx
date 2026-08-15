import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Calendar, User, Mail, MapPin, Scan, Sparkles, UserPlus, Download, Send, CheckCircle2, XCircle, IdCard, Home, Undo2, Pencil,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CITY_CENTER } from '../lib/mapConfig'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../lib/severity'
import { generateReportPdf } from '../lib/generateReportPdf'

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  under_review: 'bg-blue-100 text-blue-700',
  verified: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-[#CE1126]',
  resolved: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  resolved: 'Resolved',
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

export default function ReportDetail() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [detection, setDetection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [generating, setGenerating] = useState(false)
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

  async function fetchReport() {
    const { data, error } = await supabase
      .from('hazard_reports')
      .select('*, reporter:users!hazard_reports_user_id_fkey(username, email, full_name, address), hazard_images(image_id, image_url)')
      .eq('report_id', reportId)
      .single()

    if (!error) setReport(data)
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
    Promise.all([fetchReport(), fetchLatestDetection(), fetchInspectors(), fetchAssignment(), fetchInspectionPhotos()]).finally(
      () => setLoading(false)
    )
  }, [reportId])

  async function handleRunDetection() {
    const primaryImage = report?.hazard_images?.[0]
    if (!primaryImage?.image_url) {
      toast.error('This report has no image to analyze')
      return
    }

    setDetecting(true)
    try {
      const { data, error } = await supabase.functions.invoke('detect-hazard', {
        body: {
          reportId: report.report_id,
          imageId: primaryImage.image_id,
          imageUrl: primaryImage.image_url,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success('Hazard detection complete')
      setDetection(data.detection)
      await fetchReport()
    } catch (err) {
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
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
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
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success('AI report generated')
      await fetchReport()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Report generation failed')
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

  async function handleMarkResolved() {
    setDecisionLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('hazard_reports')
        .update({ status: 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString() })
        .eq('report_id', report.report_id)

      if (error) throw error
      toast.success('Marked as resolved')
      await fetchReport()
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


  if (loading) {
    return <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-400">Loading report...</p>
  }
  if (!report) {
    return <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-400">Report not found.</p>
  }

  const hasCorrectedLocation = report.verified_latitude && report.verified_longitude
  const position = hasCorrectedLocation
    ? [Number(report.verified_latitude), Number(report.verified_longitude)]
    : [Number(report.latitude), Number(report.longitude)]
  const images = report.hazard_images || []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/admin/reports" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0F4C81]">
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F4C81]">{report.title || 'Untitled hazard report'}</h1>
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            Submitted {formatDate(report.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.ai_report && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 rounded-lg border border-[#0F4C81]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F4C81] transition hover:bg-[#0F4C81]/5 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {downloadingPdf ? 'Preparing...' : 'Download PDF'}
            </button>
          )}
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_STYLES[report.status]}`}>
            {STATUS_LABELS[report.status]}
          </span>
        </div>
      </div>

      {/* Decision */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        {report.status === 'rejected' ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[#CE1126]">
                <XCircle className="h-4 w-4" />
                Rejected
              </p>
              <p className="mt-1 text-sm text-gray-600">Reason: {report.rejection_reason}</p>
            </div>
            <button
              onClick={handleUndoDecision}
              disabled={decisionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
          </div>
        ) : report.status === 'resolved' ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Resolved — hazard has been repaired
            </p>
            <button
              onClick={handleUndoDecision}
              disabled={decisionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
          </div>
        ) : report.status === 'approved' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Approved — visible on the public Hazard Map
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleMarkResolved}
                disabled={decisionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark as Resolved
              </button>
              <button
                onClick={handleUndoDecision}
                disabled={decisionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-[#0F4C81]">Decision</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={openApproveGallery}
                disabled={decisionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => setShowRejectForm((s) => !s)}
                disabled={decisionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-[#CE1126] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A50E1F] disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>

            {showRejectForm && (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection — this will be shown to the citizen (e.g. spam, duplicate report, not a road hazard)"
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#0F4C81] focus:border-[#CE1126] focus:outline-none"
                />
                <button
                  onClick={handleReject}
                  disabled={decisionLoading}
                  className="rounded-lg bg-[#CE1126] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A50E1F] disabled:opacity-60"
                >
                  {decisionLoading ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            )}

            {showApproveGallery && (
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">
                  Choose the best photo to represent this hazard on the public Hazard Map:
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {[...(report.hazard_images || []).map((img) => img.image_url), ...inspectionPhotos.map((p) => p.photo_url)].map(
                    (url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setSelectedImageUrl(url)}
                        className={`aspect-square overflow-hidden rounded-lg border-2 transition ${
                          selectedImageUrl === url ? 'border-[#0F4C81]' : 'border-transparent'
                        }`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    )
                  )}
                </div>
                {report.verified_latitude && report.verified_longitude && (
                  <p className="mt-3 text-xs text-blue-700">
                    ℹ️ The inspector corrected this report's location on-site — that corrected pin will be used
                    as the official location once approved.
                  </p>
                )}
                <button
                  onClick={handleConfirmApprove}
                  disabled={decisionLoading || !selectedImageUrl}
                  className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                >
                  {decisionLoading ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: photo + description */}
        <div className="space-y-4">
          {images.length > 0 && (
            <div>
              <img src={images[0].image_url} alt="" className="h-64 w-full rounded-2xl object-cover" />
              {images.length > 1 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {images.slice(1).map((img) => (
                    <img
                      key={img.image_id}
                      src={img.image_url}
                      alt=""
                      className="h-16 w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0F4C81]">Description</h2>
              {!editingDescription && (
                <button
                  onClick={() => {
                    setDescriptionDraft(report.description)
                    setEditingDescription(true)
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-[#0F4C81] hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>

            {editingDescription ? (
              <div className="mt-2 space-y-2">
                <textarea
                  rows={4}
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#0F4C81] focus:border-[#0F4C81] focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDescription}
                    disabled={savingDescription}
                    className="rounded-lg bg-[#0F4C81] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-60"
                  >
                    {savingDescription ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingDescription(false)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">{report.description}</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-[#0F4C81]">Reported By</h2>
            <div className="mt-2 space-y-1.5">
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <IdCard className="h-3.5 w-3.5 text-gray-400" />
                {report.reporter?.full_name || 'Not provided'}
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-3.5 w-3.5 text-gray-400" />
                {report.reporter?.username ?? 'Unknown'}
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                {report.reporter?.email ?? '—'}
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Home className="h-3.5 w-3.5 text-gray-400" />
                {report.reporter?.address || 'Not provided'}
              </p>
            </div>
          </div>

          {/* AI-Assisted Report */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#0F4C81]">
                <Sparkles className="h-4 w-4" />
                AI-Assisted Report
              </h2>
              <button
                onClick={handleGenerateReport}
                disabled={generating || !detection}
                title={!detection ? 'Run Computer Vision Detection first' : ''}
                className="rounded-lg bg-[#0F4C81] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-40"
              >
                {generating ? 'Drafting...' : report.ai_report ? 'Regenerate' : 'Generate'}
              </button>
            </div>

            {report.ai_report ? (
              <div className="mt-3 space-y-3">
                <ReportSection label="Executive Summary" text={report.ai_report.executive_summary} />
                <ReportSection label="Hazard Description" text={report.ai_report.hazard_description} />
                <ReportSection label="Severity Assessment" text={report.ai_report.severity_assessment} />
                <ReportSection label="Recommended Action" text={report.ai_report.recommended_action} />
                <p className="text-xs text-gray-400">Generated {formatDate(report.ai_report_generated_at)}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                {detection
                  ? 'Not generated yet. Click Generate to draft a formal report.'
                  : 'Run Computer Vision Detection first, then generate the report.'}
              </p>
            )}
          </div>
        </div>

        {/* Right: map + detection + next steps */}
        <div className="space-y-4">
          <div className="h-64 overflow-hidden rounded-2xl border border-gray-200">
            <MapContainer center={position} zoom={16} className="leaflet-container" zoomControl={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={position} />
            </MapContainer>
          </div>
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3.5 w-3.5" />
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
            {hasCorrectedLocation ? (
              <span className="text-green-700">(inspector-verified location)</span>
            ) : (
              <span>(citizen-reported location — not yet verified by inspector)</span>
            )}
          </p>

          {/* Computer Vision Detection */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#0F4C81]">
                <Scan className="h-4 w-4" />
                Computer Vision Detection
              </h2>
              <button
                onClick={handleRunDetection}
                disabled={detecting}
                className="rounded-lg bg-[#0F4C81] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-60"
              >
                {detecting ? 'Analyzing...' : detection ? 'Re-run' : 'Run Detection'}
              </button>
            </div>

            {detection ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: SEVERITY_COLORS[detection.severity_level?.toLowerCase()] || SEVERITY_COLORS.default }}
                  >
                    {SEVERITY_LABELS[detection.severity_level?.toLowerCase()] || detection.severity_level}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {formatHazardType(detection.hazard_type)}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {Number(detection.confidence_score).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm text-gray-600">{detection.detection_notes}</p>
                <p className="text-xs text-gray-400">Analyzed {formatDate(detection.detected_at)}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                Not analyzed yet. Run detection to identify the hazard type and severity.
              </p>
            )}
          </div>

          {/* Assign Inspector */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#0F4C81]">
              <UserPlus className="h-4 w-4" />
              Inspector Assignment
            </h2>

            {assignment ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-sm text-gray-600">
                  Assigned to <span className="font-medium text-[#0F4C81]">{assignment.inspector?.username}</span>
                </p>
                <p className="text-xs text-gray-400">{assignment.inspector?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-600">
                  {assignment.assignment_status}
                </span>
                <p className="text-xs text-gray-400">Assigned {formatDate(assignment.assigned_at)}</p>

                {assignment.assignment_status !== 'completed' && (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex gap-2">
                      <select
                        value={reassignSelection}
                        onChange={(e) => setReassignSelection(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-[#0F4C81] focus:border-[#0F4C81] focus:outline-none"
                      >
                        <option value="">Reassign to...</option>
                        {inspectors
                          .filter((i) => i.user_id !== assignment.assigned_to)
                          .map((i) => (
                            <option key={i.user_id} value={i.user_id}>
                              {i.username}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={handleReassignInspector}
                        disabled={reassigning}
                        className="rounded-lg bg-[#0F4C81] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-60"
                      >
                        Reassign
                      </button>
                    </div>
                    <button
                      onClick={handleCancelAssignment}
                      disabled={reassigning}
                      className="text-xs font-medium text-[#CE1126] hover:underline disabled:opacity-60"
                    >
                      Cancel Assignment
                    </button>
                  </div>
                )}
              </div>
            ) : inspectors.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">
                No inspector accounts yet.{' '}
                <Link to="/admin/inspectors" className="font-medium text-[#0F4C81] hover:underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="mt-3 flex gap-2">
                <select
                  value={selectedInspector}
                  onChange={(e) => setSelectedInspector(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#0F4C81] focus:border-[#0F4C81] focus:outline-none"
                >
                  <option value="">Select an inspector...</option>
                  {inspectors.map((i) => (
                    <option key={i.user_id} value={i.user_id}>
                      {i.username}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignInspector}
                  disabled={assigning}
                  className="flex items-center gap-1 rounded-lg bg-[#0F4C81] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportSection({ label, text }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-600">{text}</p>
    </div>
  )
}