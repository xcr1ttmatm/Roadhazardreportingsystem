// src/lib/geolocation.js
// ---------------------------------------------------------------------------
// One place for every browser location request.
//
// Phones are far less reliable than desktops here:
//   * a high-accuracy (GPS) fix can take many seconds indoors, in a car, or
//     under tree cover. Waiting for it before trying wifi/cell towers is what
//     made the old code spin for up to 35 seconds, so we now ask for both at
//     the same time and take whichever answers first.
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

// Both requests share the same ceiling, so the worst case is ~12s instead of
// 15s + 20s. A cached low-accuracy fix usually answers in well under a second.
const FIX_TIMEOUT_MS = 12000
const HIGH_ACCURACY_OPTIONS = { enableHighAccuracy: true, timeout: FIX_TIMEOUT_MS, maximumAge: 0 }
const LOW_ACCURACY_OPTIONS = { enableHighAccuracy: false, timeout: FIX_TIMEOUT_MS, maximumAge: 60000 }

function codeFor(err) {
  if (!err) return GEO.unavailable
  if (err.code === 1) return GEO.denied // PERMISSION_DENIED
  if (err.code === 3) return GEO.timeout // TIMEOUT
  return GEO.unavailable // POSITION_UNAVAILABLE
}

// When both requests fail, report the most actionable reason. A block is the
// same for both, and "no GPS lock" is friendlier than a generic error.
const CODE_PRIORITY = [GEO.denied, GEO.insecure, GEO.timeout, GEO.unavailable]
function worstCode(codes) {
  return CODE_PRIORITY.find((code) => codes.includes(code)) ?? GEO.unavailable
}

/** Returns a failure code if this page cannot ask for a location at all. */
export function geolocationBlocker() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return GEO.unsupported
  if (typeof window !== 'undefined' && window.isSecureContext === false) return GEO.insecure
  return null
}

/**
 * `'granted' | 'prompt' | 'denied' | 'unknown'`.
 *
 * 'unknown' means the browser has no Permissions API entry for geolocation
 * (Safari). Callers treat that like 'granted' so those browsers behave as they
 * always did.
 */
export async function getLocationPermission() {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  } catch {
    return 'unknown'
  }
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

/**
 * Resolves to `{ ok: true, lat, lng, accuracy }` or `{ ok: false, code }`.
 * Never throws, so callers can always show a message.
 *
 * Important: the first `getCurrentPosition` call happens synchronously inside
 * this function, so calling it straight from a button click keeps the user
 * gesture that Chrome needs before it will show the permission prompt.
 */
export function getCurrentLocation() {
  const blocker = geolocationBlocker()
  if (blocker) return Promise.resolve({ ok: false, code: blocker })

  return new Promise((resolve) => {
    let settled = false
    const failures = []

    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const succeed = (fix) => finish({ ok: true, ...fix })

    const fail = (code) => {
      // A block (or any non-location error) applies to both requests, so there
      // is nothing to wait for.
      if (code === GEO.denied) return finish({ ok: false, code })
      failures.push(code)
      if (failures.length === 2) finish({ ok: false, code: worstCode(failures) })
    }

    // Race a GPS fix against a wifi/cell fix; the first success ends the wait.
    request(HIGH_ACCURACY_OPTIONS).then(succeed, fail)
    request(LOW_ACCURACY_OPTIONS).then(succeed, fail)
  })
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
