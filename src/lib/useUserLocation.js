// src/lib/useUserLocation.js
// Follows the user's location for the Hazard Map.
//
// status:  'locating'    waiting for the browser (it may be showing the permission prompt)
//          'on'          we have a position, and it is inside the map area
//          'outside'     we have a position, but it is outside the map area (so it is not shown)
//          'denied'      the user said no, or location is turned off
//          'timeout'     the device could not get a fix in time
//          'unavailable' the device could not work out where it is (yet)
//          'unsupported' this browser cannot share a location at all
//          'insecure'    the page is not on https://
// Note: browsers only share a location on https:// pages (and on localhost).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isInsideBounds } from './geo'
import { geolocationBlocker, getCurrentLocation, isLocationBlocked } from './geolocation'

// Follow-up updates are deliberately low accuracy: the first fix already placed
// the dot, and a wifi/cell refresh is cheap and far more reliable indoors than
// asking the GPS for a brand new lock every few seconds.
const WATCH_OPTIONS = { enableHighAccuracy: false, maximumAge: 15000, timeout: 30000 }

export function useUserLocation({ bounds, contains } = {}) {
  const [state, setState] = useState({ status: 'locating', position: null })
  const watchId = useRef(null)
  const alive = useRef(true)
  const runId = useRef(0)

  // `contains(lat, lng)` wins when provided; otherwise fall back to the old
  // rectangular bounds check. Passing a module-level function keeps it stable.
  const isInside = useMemo(
    () => contains ?? (bounds ? (lat, lng) => isInsideBounds(lat, lng, bounds) : null),
    [contains, bounds]
  )

  const stop = useCallback(() => {
    if (watchId.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
  }, [])

  const apply = useCallback(
    (coords) => {
      if (isInside && !isInside(coords.lat, coords.lng)) {
        setState({ status: 'outside', position: null })
      } else {
        setState({ status: 'on', position: coords })
      }
    },
    [isInside]
  )

  const start = useCallback(async () => {
    stop()
    // Each call gets a number so a slow, superseded request (StrictMode runs the
    // effect twice in development, and users mash the locate button) can never
    // overwrite a newer result or leave an extra watcher running.
    const run = ++runId.current

    const blocked = geolocationBlocker()
    if (blocked) {
      setState({ status: blocked, position: null })
      return
    }

    // Keep the last good position on screen while we look again, so pressing the
    // locate button never makes the dot disappear.
    setState((s) => (s.position ? s : { status: 'locating', position: null }))

    // A previously blocked site fails instantly; say so instead of hanging.
    if (await isLocationBlocked()) {
      if (alive.current && run === runId.current) setState({ status: 'denied', position: null })
      return
    }

    const result = await getCurrentLocation()
    if (!alive.current || run !== runId.current) return
    if (!result.ok) {
      setState({ status: result.code, position: null })
      return
    }

    apply({ lat: result.lat, lng: result.lng, accuracy: result.accuracy })

    // Keep the dot fresh while the page stays open. A dropped update must never
    // clear a dot we already have, so the error callback does nothing.
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => apply({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => {},
      WATCH_OPTIONS
    )
  }, [apply, stop])

  useEffect(() => {
    alive.current = true
    start()
    return () => {
      alive.current = false
      stop()
    }
  }, [start, stop])

  return { ...state, retry: start }
}
