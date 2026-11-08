import { useState, useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Calendar, LocateFixed, Map as MapIcon, MapPin, ShieldCheck, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CITY_CENTER, CITY_BOUNDS, CITY_ZOOM_OUT, CITY_MIN_ZOOM, USER_FOCUS_ZOOM } from '../lib/mapConfig'
import { useUserLocation } from '../lib/useUserLocation'
import { countNearbyHazards } from '../lib/geo'
import { SEVERITY_COLORS } from '../lib/severity'
import { getDisplayPosition } from '../lib/reportLocation'
import ImageLightbox from '../components/ImageLightbox'
import BaseTiles from '../components/map/BaseTiles'
import PageHeader from '../components/ui/PageHeader'
import LoadingState from '../components/ui/LoadingState'

// Builds the Before/After photo sets for a report. "Before" leads with
// whichever photo the admin picked as featured at approval time; "After"
// comes from resolved_images, falling back to the older single
// resolved_image_url pointer for reports resolved before that table existed.
function getBeforeAfterImages(report) {
  const rawBefore = report.featured_image_url
    ? [report.featured_image_url, ...(report.hazard_images || []).map((i) => i.image_url).filter((u) => u !== report.featured_image_url)]
    : (report.hazard_images || []).map((i) => i.image_url)

  const rawAfter =
    report.resolved_images && report.resolved_images.length > 0
      ? report.resolved_images.map((i) => i.image_url)
      : report.resolved_image_url
        ? [report.resolved_image_url]
        : []

  return {
    before: rawBefore.map((url) => ({ url, label: 'Before' })),
    after: rawAfter.map((url) => ({ url, label: 'After' })),
  }
}

// Shows the "After" repair photo by default for resolved hazards, with a
// toggle to compare against the original "Before" photo. Click the photo
// to open it full-size and zoomable via the shared lightbox.
function PopupImage({ report, onOpenLightbox }) {
  const { before, after } = getBeforeAfterImages(report)
  const hasBoth = report.status === 'resolved' && before.length > 0 && after.length > 0

  const [showingAfter, setShowingAfter] = useState(true)

  const activeSet = hasBoth ? (showingAfter ? after : before) : before.length > 0 ? before : after
  if (activeSet.length === 0) return null

  function handleClick() {
    const combined = [...before, ...after]
    const startIndex = hasBoth && showingAfter ? before.length : 0
    onOpenLightbox(combined, startIndex)
  }

  return (
    <div className="mb-2">
      <button type="button" onClick={handleClick} className="block w-full">
        <img
          src={activeSet[0].url}
          alt=""
          className="max-h-40 w-full cursor-zoom-in rounded-lg bg-canvas object-contain ring-1 ring-line transition hover:opacity-90"
        />
      </button>
      {(before.length > 1 || after.length > 1) && (
        <p className="mt-1 text-center text-[10px] text-ink-muted">Click photo to view all & zoom</p>
      )}
      {hasBoth && (
        <div className="mt-1 flex overflow-hidden rounded-md border border-line text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => setShowingAfter(false)}
            className={`flex-1 py-1 transition ${!showingAfter ? 'bg-primary text-white' : 'bg-white text-ink-soft'}`}
          >
            Before
          </button>
          <button
            type="button"
            onClick={() => setShowingAfter(true)}
            className={`flex-1 py-1 transition ${showingAfter ? 'bg-success text-white' : 'bg-white text-ink-soft'}`}
          >
            After
          </button>
        </div>
      )}
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

// The blue "you are here" dot (pulses so it is not mistaken for a hazard marker).
const USER_ICON = L.divIcon({
  className: '',
  html: '<span class="relative flex h-5 w-5"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60"></span><span class="relative inline-flex h-5 w-5 rounded-full border-2 border-white bg-sky-500 shadow"></span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})
const MAX_ACCURACY_CIRCLE_M = 2000 // a rough, phone-tower-style fix can claim kilometres; do not paint them all

/** Draws the user's position and flies to it whenever centerRequest goes up. Must be inside MapContainer. */
function UserLocationLayer({ position, centerRequest }) {
  const map = useMap()

  useEffect(() => {
    if (centerRequest > 0 && position) map.flyTo([position.lat, position.lng], USER_FOCUS_ZOOM)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerRequest])

  if (!position) return null
  const center = [position.lat, position.lng]
  return (
    <>
      {position.accuracy > 0 && (
        <Circle
          center={center}
          radius={Math.min(position.accuracy, MAX_ACCURACY_CIRCLE_M)}
          pathOptions={{ color: '#0ea5e9', weight: 1, fillColor: '#0ea5e9', fillOpacity: 0.12 }}
        />
      )}
      <Marker position={center} icon={USER_ICON} zIndexOffset={1000}>
        <Popup>You are here</Popup>
      </Marker>
    </>
  )
}

function locationMessage(status, nearbyCount) {
  switch (status) {
    case 'on':
      return nearbyCount === 0
        ? 'Your location is on. No active hazards within 1 km of you.'
        : `Your location is on. ${nearbyCount} active hazard${nearbyCount === 1 ? '' : 's'} within 1 km of you.`
    case 'outside':
      return 'You appear to be outside Iligan City, so your position is not shown on this map.'
    case 'denied':
      return 'Location is off, so you are seeing the whole city. Allow location for this site in your browser settings, then press the locate button.'
    case 'unavailable':
      return 'We could not find your location yet, so you are seeing the whole city. Press the locate button to try again.'
    case 'unsupported':
      return 'This browser cannot share your location, so you are seeing the whole city.'
    default:
      return 'Finding your location...'
  }
}

function formatDate(dateString) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function HazardMap() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null) // { images, index } | null

  const { status: locStatus, position: userPos, retry: retryLocation } = useUserLocation({ bounds: CITY_BOUNDS })
  const [centerRequest, setCenterRequest] = useState(0) // each increase flies the map to the user
  const autoCentered = useRef(false)

  // Fly to the user once, on the first fix only, so later updates never fight the user's panning.
  useEffect(() => {
    if (userPos && !autoCentered.current) {
      autoCentered.current = true
      setCenterRequest((c) => c + 1)
    }
  }, [userPos])

  function handleLocateClick() {
    if (userPos) {
      setCenterRequest((c) => c + 1) // recentre on the user
    } else {
      autoCentered.current = false // fly there when a position finally arrives
      retryLocation()
    }
  }

  const activeCount = reports.filter((r) => r.status === 'approved').length // repaired ones are no longer active
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length
  const nearbyCount = countNearbyHazards(userPos, reports)

  useEffect(() => {
    async function fetchApprovedReports() {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*, hazard_images(image_url), resolved_images(image_url)')
        .in('status', ['approved', 'resolved'])

      if (!error) setReports(data)
      setLoading(false)
    }

    fetchApprovedReports()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Public Safety"
        title="Hazard Map"
        description={
          loading
            ? 'LGU-verified road hazards across Iligan City.'
            : `LGU-verified road hazards across Iligan City. ${activeCount} active hazard${activeCount === 1 ? '' : 's'}.`
        }
        icon={MapIcon}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-[11px] font-semibold text-ink-soft shadow-soft">
              <span className="h-2 w-2 rounded-full bg-danger" />
              {activeCount} active
            </span>
            <span className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-[11px] font-semibold text-ink-soft shadow-soft">
              <span className="h-2 w-2 rounded-full bg-success" />
              {resolvedCount} repaired
            </span>
          </div>
        }
      />

      <div
        data-testid="location-status"
        className="flex items-start gap-2 rounded-2xl border border-line bg-white px-3.5 py-2.5 text-xs shadow-soft"
      >
        <LocateFixed className={`mt-0.5 h-4 w-4 shrink-0 ${locStatus === 'on' ? 'text-info' : 'text-ink-muted'}`} />
        <span className="leading-relaxed text-ink-soft">{locationMessage(locStatus, nearbyCount)}</span>
      </div>

      <div className="relative h-[55vh] min-h-[340px] overflow-hidden rounded-2xl border border-line shadow-float sm:h-[65vh] sm:min-h-[420px] lg:h-[75vh]">
        <MapContainer
          center={CITY_CENTER}
          zoom={CITY_ZOOM_OUT}
          minZoom={CITY_MIN_ZOOM}
          maxBounds={CITY_BOUNDS}
          maxBoundsViscosity={1.0}
          className="leaflet-container"
        >
          <BaseTiles />

          <UserLocationLayer position={userPos} centerRequest={centerRequest} />

          {reports.map((report) => (
            <Marker
              key={report.report_id}
              position={getDisplayPosition(report)}
              icon={severityIcon(report.severity, report.status)}
            >
              <Popup>
                <div className="w-52">
                  <PopupImage
                    report={report}
                    onOpenLightbox={(images, index) => setLightbox({ images, index })}
                  />
                  <p className="text-sm font-semibold text-ink">
                    {report.title || 'Road hazard'}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs text-ink-soft">{report.description}</p>
                  {report.status === 'resolved' ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Wrench className="h-2.5 w-2.5" />
                      Resolved
                    </span>
                  ) : (
                    report.severity && (
                      <span
                        className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize text-white"
                        style={{
                          backgroundColor: SEVERITY_COLORS[report.severity?.toLowerCase()] || SEVERITY_COLORS.default,
                        }}
                      >
                        {report.severity} severity
                      </span>
                    )
                  )}
                  {report.approved_at && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-muted">
                      <Calendar className="h-3 w-3" />
                      Approved {formatDate(report.approved_at)}
                    </div>
                  )}
                  {report.status === 'resolved' && report.resolved_at && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-success">
                      <Calendar className="h-3 w-3" />
                      Repaired {formatDate(report.resolved_at)}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Locate me */}
        <button
          type="button"
          onClick={handleLocateClick}
          aria-label="Show my location"
          title="Show my location"
          className="absolute right-3 top-3 z-[400] flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-primary shadow-float transition hover:bg-primary-light/40"
        >
          <LocateFixed className="h-5 w-5" />
        </button>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[400] rounded-xl border border-line bg-white/95 px-4 py-3 shadow-float backdrop-blur">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            <ShieldCheck className="h-3 w-3 text-primary" />
            Severity
          </p>
          <div className="space-y-1.5">
            <LegendRow color={SEVERITY_COLORS.severe} label="Severe" />
            <LegendRow color={SEVERITY_COLORS.moderate} label="Moderate" />
            <LegendRow color={SEVERITY_COLORS.low} label="Low" />
            <LegendRow color={SEVERITY_COLORS.default} label="Unspecified" />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading verified hazards…" />
      ) : (
        reports.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-secondary-light text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">No approved hazards yet</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-soft">
              Once the LGU approves reports, they'll appear here.
            </p>
          </div>
        )
      )}

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

function LegendRow({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }} />
      <span className="text-xs text-ink-soft">{label}</span>
    </div>
  )
}
