import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Calendar, User, MapPin, Scan, Sparkles, Download, ImagePlus, X, Send, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
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
}
const STATUS_LABELS = {
  pending: 'Pending', under_review: 'Under Review', verified: 'Verified', approved: 'Approved', rejected: 'Rejected',
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
  const [findings, setFindings] = useState('')
  const [newPhotoFiles, setNewPhotoFiles] = useState([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([])

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
    if (!findings.trim()) {
      toast.error('Please describe your site inspection findings')
      return
    }
    setSubmitting(true)
    try {
      const { error: assignError } = await supabase
        .from('inspector_assignments')
        .update({ assignment_status: 'completed', completed_at: new Date().toISOString(), remarks: findings.trim() })
        .eq('assignment_id', assignment.assignment_id)
      if (assignError) throw assignError

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

  if (loading) return <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-400">Loading...</p>
  if (!report) return <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-400">Report not found.</p>
  if (!assignment) {
    return (
      <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-400">
        This report isn't assigned to you.
      </p>
    )
  }

  const position = [Number(report.latitude), Number(report.longitude)]
  const image = report.hazard_images?.[0]?.image_url

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/inspector" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0F4C81]">
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
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

      {/* Assignment status / accept */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        {assignment.assignment_status === 'pending' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">You've been assigned to inspect this hazard on-site.</p>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {accepting ? 'Accepting...' : 'Accept Assignment'}
            </button>
          </div>
        ) : assignment.assignment_status === 'completed' ? (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Inspection completed {formatDate(assignment.completed_at)}
            </p>
            <p className="mt-2 text-sm text-gray-600">{assignment.remarks}</p>
          </div>
        ) : (
          <p className="text-sm text-blue-700">Assignment accepted — conduct your site inspection below.</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: citizen's photo + description + reporter */}
        <div className="space-y-4">
          {image && <img src={image} alt="" className="h-56 w-full rounded-2xl object-cover" />}

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-[#0F4C81]">Citizen's Description</h2>
            <p className="mt-2 text-sm text-gray-600">{report.description}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-[#0F4C81]">Reported By</h2>
            <div className="mt-2 space-y-1.5">
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-3.5 w-3.5 text-gray-400" />
                {report.reporter?.username ?? 'Unknown'}
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {report.reporter?.address || 'Not provided'}
              </p>
            </div>
          </div>

          {detection && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#0F4C81]">
                <Scan className="h-4 w-4" />
                Computer Vision Detection
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: SEVERITY_COLORS[detection.severity_level?.toLowerCase()] || SEVERITY_COLORS.default }}
                >
                  {SEVERITY_LABELS[detection.severity_level?.toLowerCase()] || detection.severity_level}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {formatHazardType(detection.hazard_type)}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{detection.detection_notes}</p>
            </div>
          )}

          {report.ai_report && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#0F4C81]">
                <Sparkles className="h-4 w-4" />
                AI-Assisted Report
              </h2>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Executive Summary</p>
                  <p className="mt-1 text-sm text-gray-600">{report.ai_report.executive_summary}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recommended Action</p>
                  <p className="mt-1 text-sm text-gray-600">{report.ai_report.recommended_action}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: map + site inspection work */}
        <div className="space-y-4">
          <div className="h-56 overflow-hidden rounded-2xl border border-gray-200">
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
          </p>

          {assignment.assignment_status !== 'pending' && (
            <>
              {/* Upload inspection photos */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0F4C81]">Site Inspection Photos</h2>

                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <img key={p.inspection_photo_id} src={p.photo_url} alt="" className="aspect-square rounded-lg object-cover" />
                    ))}
                  </div>
                )}

                {assignment.assignment_status !== 'completed' && (
                  <>
                    {newPhotoPreviews.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {newPhotoPreviews.map((src, i) => (
                          <div key={src} className="group relative aspect-square overflow-hidden rounded-lg">
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeNewPhoto(i)}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
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
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 transition hover:border-[#0F4C81] hover:bg-[#0F4C81]/5"
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
                        <button
                          onClick={handleUploadPhotos}
                          disabled={uploading}
                          className="rounded-lg bg-[#0F4C81] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-60"
                        >
                          {uploading ? 'Uploading...' : `Upload ${newPhotoFiles.length} photo${newPhotoFiles.length === 1 ? '' : 's'}`}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Submit findings */}
              {assignment.assignment_status !== 'completed' && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="text-sm font-semibold text-[#0F4C81]">Verification Findings</h2>
                  <textarea
                    rows={4}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Describe what you found on-site — does it match the citizen's report? Severity confirmed? Recommended repair?"
                    className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#0F4C81] focus:border-[#0F4C81] focus:outline-none"
                  />
                  <button
                    onClick={handleSubmitFindings}
                    disabled={submitting}
                    className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? 'Submitting...' : 'Submit Verification'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}