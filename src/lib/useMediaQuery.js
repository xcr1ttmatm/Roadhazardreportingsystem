import { useEffect, useState } from 'react'

/**
 * Tracks a CSS media query in React.
 *
 * The initial value is read synchronously from `window.matchMedia`, so the first
 * render already knows if this is a phone - no flash of the desktop marker
 * popup before an effect runs.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const onChange = (event) => setMatches(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
