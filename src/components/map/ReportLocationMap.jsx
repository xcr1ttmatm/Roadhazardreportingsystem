import { useEffect } from 'react'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import BaseTiles from './BaseTiles'
import CoverageBoundary from './CoverageBoundary'

// Explicit icons (instead of Leaflet's default icon URLs) so this component is
// self-contained and never mutates the global Marker defaults.
const PINNED_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width: 18px; height: 18px; border-radius: 9999px;
    background: #2563eb; border: 2.5px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.45);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
})

const VERIFIED_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width: 18px; height: 18px; border-radius: 9999px;
    background: #16a34a; border: 2.5px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.45);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
})

function isValidPosition(position) {
  return Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1])
}

/** Fit both pins on screen when an inspector has corrected the location. */
function FitToPins({ pinned, verified }) {
  const map = useMap()
  const [pinnedLat, pinnedLng] = pinned
  const verifiedLat = verified?.[0]
  const verifiedLng = verified?.[1]

  useEffect(() => {
    if (verifiedLat == null || verifiedLng == null) return
    map.fitBounds(
      [
        [pinnedLat, pinnedLng],
        [verifiedLat, verifiedLng],
      ],
      { padding: [36, 36], maxZoom: 17 }
    )
  }, [map, pinnedLat, pinnedLng, verifiedLat, verifiedLng])

  return null
}

/**
 * Read-only mini map for a hazard report's location.
 *
 * Shows the exact spot the citizen pinned at submission (blue) and, when an
 * inspector moved it, the verified location (green) as well — so citizens can
 * review and trust what was recorded. Reuses the shared basemap and Iligan
 * coverage boundary, so the map matches every other map in the app.
 *
 * @param {number[]} position - [lat, lng] the citizen pinned when submitting
 * @param {number[]} [verifiedPosition] - [lat, lng] confirmed/corrected by an inspector
 */
export default function ReportLocationMap({ position, verifiedPosition, className = '', heightClass = 'h-52' }) {
  if (!isValidPosition(position)) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-line bg-canvas/60 px-3 py-6 text-center text-xs text-ink-muted ${heightClass} ${className}`}
      >
        No map location was saved with this report.
      </div>
    )
  }

  const verified = isValidPosition(verifiedPosition) ? verifiedPosition : null

  return (
    <div className={`overflow-hidden rounded-xl border border-line ${heightClass} ${className}`}>
      <MapContainer center={position} zoom={16} scrollWheelZoom={false} className="leaflet-container">
        <BaseTiles />
        <CoverageBoundary />

        <Marker position={position} icon={PINNED_ICON}>
          <Popup>Your pinned location</Popup>
        </Marker>

        {verified && (
          <Marker position={verified} icon={VERIFIED_ICON}>
            <Popup>Inspector-verified location</Popup>
          </Marker>
        )}

        <FitToPins pinned={position} verified={verified} />
      </MapContainer>
    </div>
  )
}
