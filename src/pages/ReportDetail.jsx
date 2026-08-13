import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, Calendar, User, Mail, MapPin, Scan, FileText, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CITY_CENTER } from '../lib/mapConfig'

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

export default function ReportDetail() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*, reporter:users!hazard_reports_user_id_fkey(username, email), hazard_images(image_url)')
        .eq('report_id', reportId)
        .single()

      if (!error) setReport(data)
      setLoading(false)
    }

    fetchReport()
  }, [reportId])

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

        {/* Right: map + next-step actions */}
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

          {/* Placeholders for upcoming modules — wired up as we build them */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-[#0F4C81]">Next Steps</h2>
            <div className="mt-3 space-y-2">
              <button
                disabled
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-left text-sm text-gray-400"
              >
                <Scan className="h-4 w-4" />
                Run Computer Vision Detection
                <span className="ml-auto text-[10px] uppercase tracking-wide">Module 8</span>
              </button>
              <button
                disabled
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-left text-sm text-gray-400"
              >
                <FileText className="h-4 w-4" />
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