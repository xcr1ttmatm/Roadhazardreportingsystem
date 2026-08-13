// Shared map configuration — used by every Leaflet map in the app
// (report submission, hazard map viewing, inspector site maps, etc.)
// Update these two values here if the study area ever changes.

export const CITY_CENTER = [8.228, 124.2452] // Iligan City, Lanao del Norte, PH

// Bounding box around Iligan City — panning outside this is blocked.
// Widened to cover the full land area, since Iligan stretches well inland
// into the mountains, not just the coastal downtown area.
export const CITY_BOUNDS = [
  [8.05, 124.05], // southwest corner
  [8.45, 124.5],  // northeast corner
]

export const CITY_DEFAULT_ZOOM = 13
export const CITY_MIN_ZOOM = 12