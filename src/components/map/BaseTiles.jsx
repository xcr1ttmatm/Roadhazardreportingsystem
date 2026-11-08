import { TileLayer } from 'react-leaflet'
import { MAP_LAYERS } from '../../lib/mapConfig'

/**
 * The shared basemap for every Leaflet map in the app.
 *
 * Layers come from `MAP_LAYERS` in `src/lib/mapConfig.js`:
 *   - MapTiler when VITE_MAPTILER_KEY is set (full street style, HiDPI tiles)
 *   - Esri's keyless full street map otherwise
 *
 * Keeping this in one place means the hazard map, report submission, admin
 * previews and inspector maps always look identical — and switching styles
 * later (or adding a dark-mode basemap) is a one-file change.
 */
export default function BaseTiles() {
  return MAP_LAYERS.map((layer) => (
    <TileLayer
      key={layer.id}
      url={layer.url}
      maxZoom={layer.maxZoom}
      maxNativeZoom={layer.maxNativeZoom}
      {...(layer.attribution ? { attribution: layer.attribution } : {})}
      {...(layer.subdomains ? { subdomains: layer.subdomains } : {})}
    />
  ))
}
