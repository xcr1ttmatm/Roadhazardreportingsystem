// src/lib/geolocation.js
// ---------------------------------------------------------------------------
// One place for every browser location request.
//
// Phones are far less reliable than desktops here:
//   * a high-accuracy (GPS) fix can simply time out indoors, in a car, or under
//     tree cover -> we retry once at low accuracy, which uses wifi/cell towers
//     and almost always answers within a few seconds. A rough pin beats no pin.
//   * browsers only share a location on a secure page (https, or localhost).
//   * if the visitor pressed "Block" once, the browser will never ask again and
//     fails instantly, so that case needs its own message.
//
// Every failure is returned as a plain code so callers can show a useful
// message instead of a generic "could not get location":
//   'unsupported' | 'insecure' | 'denied' | 'timeout' | 'unavailable'
// ---------------------------------------------------------------------------

export const GEO = {
  unsupported: 'unsupported',
  insecure: 'insecure',
  denied: 'denied',
  timeout: 'timeout',
  unavailable: 'unavailable',
}

function codeFor(err) {
  if (!err) return GEO.unavailable
  if (err.code === 1) return GEO.denied // PERMISSION_DENIED
  if (err.code === 3) return GEO.timeout // TIMEOUT
  return GEO.unavailable // POSITION_UNAVAILABLE
}

/** Returns a failure code if this page cannot ask for a location at all. */
export function geolocationBlocker() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return GEO.unsupported
  if (typeof window !== 'undefined' && window.isSecureContext === false) return GEO.insecure
  return null
}

function request(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(codeFor(err)),
      options
    )
  })
}

/** True when the browser has already been told "block" for this site. */
export async function isLocationBlocked() {
  try {
    if (!navigator.permissions?.query) return false
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state === 'denied'
  } catch {
    return false // some browsers refuse to answer; just try normally
  }
}

/**
 * Resolves to `{ ok: true, lat, lng, accuracy }` or `{ ok: false, code }`.
 * Never throws, so callers can always show a message.
 */
export async function getCurrentLocation() {
  const blocker = geolocationBlocker()
  if (blocker) return { ok: false, code: blocker }

  try {
    return { ok: true, ...(await request({ enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 })) }
  } catch (firstCode) {
    if (firstCode === GEO.denied) return { ok: false, code: GEO.denied }
    try {
      return { ok: true, ...(await request({ enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 })) }
    } catch {
      return { ok: false, code: firstCode }
    }
  }
}

/** Human-readable reason, used for toasts and status lines. */
export function locationErrorMessage(code) {
  switch (code) {
    case GEO.denied:
      return 'Location is blocked for this site. Open your browser settings, allow location for it, then try again.'
    case GEO.insecure:
      return 'Location only works on an https:// address. Open the site with https and try again.'
    case GEO.timeout:
      return "Couldn't get a GPS fix. Move somewhere with a clearer view of the sky, or pin the spot on the map."
    case GEO.unsupported:
      return 'This browser cannot share your location. Pin the spot on the map instead.'
    default:
      return "Couldn't find your location. Pin the spot on the map instead."
  }
}
