// src/lib/useUserLocation.js
// Follows the user's location for the Hazard Map.
//
// status:  'locating'    waiting for the browser (it may be showing the permission prompt)
//          'on'          we have a position, and it is inside the map area
//          'outside'     we have a position, but it is outside the map area (so it is not shown)
//          'denied'      the user said no, or location is turned off
//          'unavailable' the device could not work out where it is (yet)
//          'unsupported' this browser cannot share a location at all
// Note: browsers only share a location on https:// pages (and on localhost).
import { useCallback, useEffect, useRef, useState } from 'react'
import { isInsideBounds } from './geo'

const OPTIONS = { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }

export function useUserLocation({ bounds } = {}) {
  const [state, setState] = useState({ status: 'locating', position: null })
  const watchId = useRef(null)

  const stop = useCallback(() => {
    if (watchId.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
  }, [])

  const start = useCallback(() => {
    stop()
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unsupported', position: null })
      return
    }
    setState((s) => (s.position ? s : { status: 'locating', position: null }))

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        if (bounds && !isInsideBounds(latitude, longitude, bounds)) {
          setState({ status: 'outside', position: null })
        } else {
          setState({ status: 'on', position: { lat: latitude, lng: longitude, accuracy } })
        }
      },
      (err) => {
        if (err.code === 1) {
          setState({ status: 'denied', position: null }) // permission refused or revoked
        } else {
          // Timeout / no signal: keep showing the last good position if there is one.
          setState((s) => (s.position ? s : { status: 'unavailable', position: null }))
        }
      },
      OPTIONS
    )
  }, [bounds, stop])

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  return { ...state, retry: start }
}