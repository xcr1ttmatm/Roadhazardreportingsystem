import { Polygon } from 'react-leaflet'
import { ILIGAN_LEAFLET_POLYGONS } from '../../lib/geo'

// Deliberately blue (the NEXORA primary) instead of a hazard colour: this is the
// service-area outline, not a severity indicator. `interactive={false}` keeps it
// out of the click/pointer path so markers, popups and map pinning still work.
const COVERAGE_PATH_OPTIONS = {
  color: '#2563eb',
  weight: 2,
  opacity: 0.85,
  dashArray: '8 6',
  lineCap: 'round',
  fill: true,
  fillColor: '#2563eb',
  fillOpacity: 0.04,
}

/**
 * Draws the Iligan City coverage boundary on a Leaflet map.
 *
 * Shared by the public Hazard Map, the citizen submission map and the
 * inspector location-correction map, so every role sees the same service area.
 */
export default function CoverageBoundary() {
  return ILIGAN_LEAFLET_POLYGONS.map((rings, index) => (
    <Polygon
      key={index}
      positions={rings}
      pathOptions={COVERAGE_PATH_OPTIONS}
      interactive={false}
    />
  ))
}
