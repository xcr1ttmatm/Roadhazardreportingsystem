import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CITY_CENTER, CITY_BOUNDS, CITY_DEFAULT_ZOOM, CITY_MIN_ZOOM } from '../lib/mapConfig'
import { SEVERITY_COLORS } from '../lib/severity'
import { getDisplayPosition } from '../lib/reportLocation'

// Shows the "After" repair photo by default for resolved hazards, with a
// small toggle to compare against the original "Before" photo.
function PopupImage({ report }) {
  const beforeUrl = report.featured_image_url || report.hazard_images?.[0]?.image_url
  const afterUrl = report.resolved_image_url
  const hasBothPhotos = report.status === 'resolved' && beforeUrl && afterUrl

  const [showingAfter, setShowingAfter] = useState(true)

  if (!hasBothPhotos) {
    return beforeUrl ? <img src={beforeUrl} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" /> : null
  }

  return (
    <div className="mb-2">
      <img
        src={showingAfter ? afterUrl : beforeUrl}
        alt=""
        className="h-28 w-full rounded-lg object-cover"
      />
      <div className="mt-1 flex overflow-hidden rounded-md border border-gray-200 text-[10px] font-medium">
        <button
          type="button"
          onClick={() => setShowingAfter(false)}
          className={`flex-1 py-1 transition ${!showingAfter ? 'bg-[#0F4C81] text-white' : 'bg-white text-gray-500'}`}
        >
          Before
        </button>
        <button
          type="button"
          onClick={() => setShowingAfter(true)}
          className={`flex-1 py-1 transition ${showingAfter ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'}`}
        >
          After
        </button>
      </div>
    </div>
  )
}

function severityIcon(severity, status) {
  const color = status === 'resolved' ? '#16A34A' : SEVERITY_COLORS[severity?.toLowerCase()] || SEVERITY_COLORS.default
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 18px; height: 18px; border-radius: 9999px;
      background: ${color}; border: 2.5px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.45);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  })
}

function formatDate(dateString) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function HazardMap() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchApprovedReports() {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*, hazard_images(image_url)')
        .in('status', ['approved', 'resolved'])

      if (!error) setReports(data)
      setLoading(false)
    }

    fetchApprovedReports()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0F4C81]">Hazard Map</h1>
      <p className="mt-1 text-sm text-gray-500">
        LGU-verified road hazards across Iligan City.
        {!loading && ` ${reports.length} active hazard${reports.length === 1 ? '' : 's'}.`}
      </p>

      <div className="relative mt-6 h-[75vh] min-h-[420px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <MapContainer
          center={CITY_CENTER}
          zoom={CITY_DEFAULT_ZOOM}
          minZoom={CITY_MIN_ZOOM}
          maxBounds={CITY_BOUNDS}
          maxBoundsViscosity={1.0}
          className="leaflet-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {reports.map((report) => (
            <Marker
              key={report.report_id}
              position={getDisplayPosition(report)}
              icon={severityIcon(report.severity, report.status)}
            >
              <Popup>
                <div className="w-52">
                  <PopupImage report={report} />
                  <p className="text-sm font-semibold text-[#0F4C81]">
                    {report.title || 'Road hazard'}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs text-gray-600">{report.description}</p>
                  {report.status === 'resolved' ? (
                    <span className="mt-2 inline-block rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">
                      Resolved
                    </span>
                  ) : (
                    report.severity && (
                      <span
                        className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize text-white"
                        style={{
                          backgroundColor: SEVERITY_COLORS[report.severity?.toLowerCase()] || SEVERITY_COLORS.default,
                        }}
                      >
                        {report.severity} severity
                      </span>
                    )
                  )}
                  {report.approved_at && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                      <Calendar className="h-3 w-3" />
                      Approved {formatDate(report.approved_at)}
                    </div>
                  )}
                  {report.status === 'resolved' && report.resolved_at && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                      <Calendar className="h-3 w-3" />
                      Repaired {formatDate(report.resolved_at)}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[400] rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-md backdrop-blur">
          <p className="mb-2 text-xs font-semibold text-[#0F4C81]">Severity</p>
          <div className="space-y-1.5">
            <LegendRow color={SEVERITY_COLORS.severe} label="Severe" />
            <LegendRow color={SEVERITY_COLORS.moderate} label="Moderate" />
            <LegendRow color={SEVERITY_COLORS.low} label="Low" />
            <LegendRow color={SEVERITY_COLORS.default} label="Unspecified" />
          </div>
        </div>
      </div>

      {!loading && reports.length === 0 && (
        <p className="mt-4 text-center text-sm text-gray-400">
          No approved hazards yet — once the LGU approves reports, they'll appear here.
        </p>
      )}
    </div>
  )
}

function LegendRow({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  )
}