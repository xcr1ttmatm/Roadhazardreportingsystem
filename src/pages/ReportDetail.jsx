import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import { ArrowLeft, Calendar, User, Mail, MapPin, Scan, FileText, UserPlus, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CITY_CENTER } from '../lib/mapConfig'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../lib/severity'

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
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

  async function fetchReport() {
    const { data, error } = await supabase
      .from('hazard_reports')
      .select('*, reporter:users!hazard_reports_user_id_fkey(username, email), hazard_images(image_id, image_url)')
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

  useEffect(() => {
    Promise.all([fetchReport(), fetchLatestDetection()]).finally(() => setLoading(false))
  }, [reportId])

  async function handleRunDetection() {
    if (!report?.hazard_images?.[0]?.image_url) {
      toast.error('This report has no image to analyze')
      return
    }

    setDetecting(true)
    try {
      const { data, error } = await supabase.functions.invoke('detect-hazard', {
        body: {
          reportId: report.report_id,
          imageId: report.hazard_images[0].image_id,
          imageUrl: report.hazard_images[0].image_url,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success('Hazard detection complete')
      setDetection(data.detection)
      await fetchReport() // refresh severity + status shown on the page
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Detection failed')
    } finally {
      setDetecting(false)
    }
  }

  if (loading) {
    return <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-400">Loading report...</p>
  }

  if (!report) {
    return <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-400">Report not found.</p>
  }

  const position = [Number(report.latitude), Number(report.longitude)]
  const image = report.hazard_images?.[0]?.image_url

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
        <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_STYLES[report.status]}`}>
          {STATUS_LABELS[report.status]}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: photo + description */}
        <div className="space-y-4">
          {image && <img src={image} alt="" className="h-64 w-full rounded-2xl object-cover" />}

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-[#0F4C81]">Description</h2>
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
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                {report.reporter?.email ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: map + workflow actions */}
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
                    style={{
                      backgroundColor:
                        SEVERITY_COLORS[detection.severity_level?.toLowerCase()] || SEVERITY_COLORS.default,
                    }}
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

          {/* Placeholders for upcoming modules */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-[#0F4C81]">Next Steps</h2>
            <div className="mt-3 space-y-2">
              <button
                disabled
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-left text-sm text-gray-400"
              >
                <Sparkles className="h-4 w-4" />
                Generate AI-Assisted Report
                <span className="ml-auto text-[10px] uppercase tracking-wide">Module 9</span>
              </button>
              <button
                disabled
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-left text-sm text-gray-400"
              >
                <UserPlus className="h-4 w-4" />
                Assign Inspector
                <span className="ml-auto text-[10px] uppercase tracking-wide">Module 10</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}