// src/lib/geo.js
// Small location helpers for the Hazard Map. No browser code in here, so it can be tested on its own.
import { getDisplayPosition } from './reportLocation'

const EARTH_RADIUS_M = 6371000

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