// src/lib/useUserLocation.js
// Follows the user's location for the Hazard Map.
//
// status:  'idle'        permission has not been asked for yet (we wait for a tap)
//          'locating'    waiting for the browser (it may be showing the permission prompt)
//          'on'          we have a position, and it is inside the map area
//          'outside'     we have a position, but it is outside the map area (so it is not shown)
//          'dismissed'   the visitor closed the permission prompt without choosing
//          'denied'      the user said no, or location is turned off
//          'timeout'     the device could not get a fix in time
//          'unavailable' the device could not work out where it is (yet)
//          'unsupported' this browser cannot share a location at all
//          'insecure'    the page is not on https://
// Note: browsers only share a location on https:// pages (and on localhost).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isInsideBounds } from './geo'
import { GEO, geolocationBlocker, getCurrentLocation, getLocationPermission } from './geolocation'

// Follow-up updates keep high accuracy: on a phone the whole point is to stay
// on the user as they walk. `maximumAge` lets a recent fix be reused instead of
// re-locking the GPS every time.
const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }

// Android Chrome can keep a page "locating" forever when the permission prompt
// never appears. After this long the UI starts explaining how to unblock it.
const SLOW_AFTER_MS = 5000

export function useUserLocation({ bounds, contains } = {}) {
  const [state, setState] = useState({ status: 'locating', position: null, permission: 'unknown', slow: false })
  const watchId = useRef(null)
  const slowTimer = useRef(null)
  const alive = useRef(true)
  const runId = useRef(0)
  const inFlightRun = useRef(null)
  const lastPosition = useRef(null)

  // `contains(lat, lng)` wins when provided; otherwise fall back to the old
  // rectangular bounds check. Passing a module-level function keeps it stable.
  const isInside = useMemo(
    () => contains ?? (bounds ? (lat, lng) => isInsideBounds(lat, lng, bounds) : null),
    [contains, bounds]
  )

  const stop = useCallback(() => {
    if (slowTimer.current != null) {
      clearTimeout(slowTimer.current)
      slowTimer.current = null
    }
    if (watchId.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
  }, [])

  const apply = useCallback(
    (coords) => {
      lastPosition.current = coords
      if (isInside && !isInside(coords.lat, coords.lng)) {
        setState({ status: 'outside', position: null, permission: 'granted', slow: false })
      } else {
        setState({ status: 'on', position: coords, permission: 'granted', slow: false })
      }
    },
    [isInside]
  )

  /**
   * Asks for a fix.
   *
   * `auto: true` is the page-load path and is deliberately conservative: it
   * only locates when the browser already granted permission. A fresh prompt
   * must come from a real tap (`auto: false`), because Android Chrome ignores
   * prompt requests that are not tied to a user gesture - the exact bug where
   * "no permission prompt appears at all" and the page just spins.
   */
  const begin = useCallback(
    async ({ auto = false } = {}) => {
      stop()
      // Each call gets a number so a slow, superseded request (StrictMode runs
      // the effect twice in development, and users mash the locate button) can
      // never overwrite a newer result or leave an extra watcher running.
      const run = ++runId.current

      const blocker = geolocationBlocker()
      if (blocker) {
        setState({ status: blocker, position: null, permission: 'unknown', slow: false })
        return
      }

      if (auto) {
        const permission = await getLocationPermission()
        if (!alive.current || run !== runId.current) return
        if (permission === 'prompt' || permission === 'denied') {
          setState({
            status: permission === 'denied' ? 'denied' : 'idle',
            position: null,
            permission,
            slow: false,
          })
          return
        }
      }

      // Keep the last good position on screen while we look again, so pressing
      // the locate button never makes the dot disappear.
      setState((s) => ({
        status: lastPosition.current ? s.status : 'locating',
        position: lastPosition.current,
        permission: s.permission,
        slow: false,
      }))

      slowTimer.current = setTimeout(() => {
        slowTimer.current = null
        if (!alive.current || run !== runId.current) return
        setState((s) => (s.position ? s : { ...s, slow: true }))
      }, SLOW_AFTER_MS)

      // Called synchronously from the tap handler on the retry path, so the
      // browser still sees a user gesture.
      inFlightRun.current = run
      const result = await getCurrentLocation()
      if (inFlightRun.current === run) inFlightRun.current = null
      if (slowTimer.current != null) {
        clearTimeout(slowTimer.current)
        slowTimer.current = null
      }
      if (!alive.current || run !== runId.current) return

      if (!result.ok) {
        let code = result.code
        let permission = null
        if (code === GEO.denied) {
          permission = await getLocationPermission()
          if (!alive.current || run !== runId.current) return
          // Dismissing the prompt also reports PERMISSION_DENIED, but the site
          // is not actually blocked. Say "dismissed" instead of sending the
          // visitor to browser settings that have nothing to change.
          if (permission === 'prompt') code = 'dismissed'
        }
        setState((s) => ({
          // A retry that fails must not wipe a dot we already have.
          status: s.position ? s.status : code,
          position: s.position,
          permission: permission ?? s.permission,
          slow: false,
        }))
        return
      }

      apply({ lat: result.lat, lng: result.lng, accuracy: result.accuracy })

      // Keep the dot fresh while the page stays open. A dropped update must
      // never clear a dot we already have, so the error callback does nothing.
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!alive.current || run !== runId.current) return
          apply({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        },
        () => {},
        WATCH_OPTIONS
      )
    },
    [apply, stop]
  )

  const retry = useCallback(() => begin({ auto: false }), [begin])

  useEffect(() => {
    alive.current = true
    // Starting the browser location watcher is an "external system" setup, and
    // the state updates arrive from its callbacks - not from this render pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    begin({ auto: true })
    return () => {
      alive.current = false
      stop()
    }
  }, [begin, stop])

  // If the visitor flips the site back to "Allow" in browser settings while the
  // app is still open, pick the fix up without making them reload the page.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return undefined

    let cancelled = false
    let status = null

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (cancelled) return
        status = result
        status.onchange = () => {
          setState((s) => ({
            ...s,
            permission: status.state,
            status: s.position ? s.status : status.state === 'denied' ? 'denied' : 'idle',
          }))
          if (status.state === 'granted' && !inFlightRun.current && !lastPosition.current) {
            begin({ auto: true })
          }
        }
      })
      .catch(() => {}) // no Permissions API entry (Safari) - nothing to watch

    return () => {
      cancelled = true
      if (status) status.onchange = null
    }
  }, [begin])

  return { ...state, accuracy: state.position?.accuracy ?? null, retry }
}
