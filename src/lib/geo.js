// src/lib/geo.js
// Small location helpers for the Hazard Map. No browser code in here, so it can be tested on its own.
import { getDisplayPosition } from './reportLocation'
import { ILIGAN_BOUNDARY, ILIGAN_BBOX } from './iliganBoundary'

const EARTH_RADIUS_M = 6371000

// The city outline as one or more polygons; each polygon is [outerRing, ...holes],
// and each ring is GeoJSON-ordered [longitude, latitude].
const ILIGAN_POLYGONS =
  ILIGAN_BOUNDARY.type === 'Polygon' ? [ILIGAN_BOUNDARY.coordinates] : ILIGAN_BOUNDARY.coordinates

/**
 * The city outline in Leaflet's [latitude, longitude] order, ready for
 * `<Polygon positions={...}>`. One entry per polygon (and its holes).
 */
export const ILIGAN_LEAFLET_POLYGONS = ILIGAN_POLYGONS.map((polygon) =>
  polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng]))
)

/** Ray-casting test for one GeoJSON ring ([longitude, latitude] points). */
function ringContains(lat, lng, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * True when a coordinate falls inside the Iligan City service area.
 *
 * Uses a bounding-box check first, then tests the real city outline (including
 * any holes), so it rejects neighbouring municipalities, the sea outside the
 * city limit, and anything else outside the coverage area. Edges are treated as
 * inside. This is the single source of truth for every "inside Iligan?" gate.
 */
export function isInsideIligan(lat, lng) {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false

  const [west, south, east, north] = ILIGAN_BBOX
  if (latitude < south || latitude > north || longitude < west || longitude > east) return false

  return ILIGAN_POLYGONS.some(
    (polygon) =>
      ringContains(latitude, longitude, polygon[0]) &&
      !polygon.slice(1).some((hole) => ringContains(latitude, longitude, hole))
  )
}

/** Straight-line distance between two lat/lng points, in metres. */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

/** bounds = [[south, west], [north, east]], the same shape the map uses. Edges count as inside. */
export function isInsideBounds(lat, lng, bounds) {
  const [[south, west], [north, east]] = bounds
  return lat >= south && lat <= north && lng >= west && lng <= east
}

/**
 * How many ACTIVE hazards (approved and not yet repaired) are within radiusMeters of the user.
 * Repaired ("resolved") hazards are no longer a danger, so they are not counted.
 * Uses the inspector-verified position when there is one, like the map pins do.
 */
export function countNearbyHazards(userPos, reports, radiusMeters = 1000) {
  if (!userPos) return 0
  return reports.filter((r) => {
    if (r.status !== 'approved') return false
    const [lat, lng] = getDisplayPosition(r)
    return haversineMeters(userPos.lat, userPos.lng, lat, lng) <= radiusMeters
  }).length
}