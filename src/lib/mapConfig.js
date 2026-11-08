// Shared map configuration — used by every Leaflet map in the app
// (report submission, hazard map viewing, inspector site maps, etc.)
// Update these two values here if the study area ever changes.

export const CITY_CENTER = [8.228, 124.2452] // Iligan City, Lanao del Norte, PH

// Basemap used by every Leaflet map in the app.
//
// Primary: MapTiler (set VITE_MAPTILER_KEY in .env/.env.local). The style is
// configurable without touching any component: VITE_MAPTILER_STYLE=<style id>.
// `streets-v4` is the default because it shows the full street network.
//
// Fallback: Esri's keyless World Street Map. Used when no MapTiler key is
// configured, so the map can never show a provider's "API KEY REQUIRED"
// watermark (which is what CARTO's free tiles now do).
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY
const MAPTILER_STYLE = import.meta.env.VITE_MAPTILER_STYLE || 'streets-v4'

const MAPTILER_ATTRIBUTION =
  '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community'

// MapTiler serves 256px tiles; the @2x suffix asks for the same tile at double
// the pixel density so lines and labels stay sharp on HiDPI screens without
// increasing the number of requests.
export const MAP_LAYERS = MAPTILER_KEY
  ? [
      {
        id: 'maptiler',
        url: `https://api.maptiler.com/maps/${MAPTILER_STYLE}/256/{z}/{x}/{y}@2x.png?key=${MAPTILER_KEY}`,
        attribution: MAPTILER_ATTRIBUTION,
        maxZoom: 20,
      },
    ]
  : [
      // Keyless fallback: Esri's full street map (not the sparse light-grey
      // canvas) so minor roads stay visible even before a MapTiler key is set.
      {
        id: 'esri-streets',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: ESRI_ATTRIBUTION,
        maxZoom: 20,
        maxNativeZoom: 19,
      },
    ]

// Bounding box around Iligan City — panning outside this is blocked.
// Widened to cover the full land area, since Iligan stretches well inland
// into the mountains, not just the coastal downtown area.
export const CITY_BOUNDS = [
  [8.05, 124.05], // southwest corner
  [8.45, 124.5],  // northeast corner
]

export const CITY_DEFAULT_ZOOM = 13
export const CITY_MIN_ZOOM = 12

// Hazard Map: the widest view the map allows, used when the user's location is off or unavailable.
export const CITY_ZOOM_OUT = CITY_MIN_ZOOM
// Hazard Map: how close to zoom in on the user once their location is known (about a few city blocks).
export const USER_FOCUS_ZOOM = 15