/**
 * Returns the location that should be shown/used for a report.
 * Prefers the inspector's verified/corrected pin (verified_latitude,
 * verified_longitude) over the citizen's original submission — since an
 * inspector physically confirmed it on-site, it's more trustworthy.
 *
 * Used everywhere a report's location is displayed or embedded, so a
 * correction shows up consistently across the whole app (Hazard Map,
 * Report Detail, Track Reports, the PDF export) instead of only some of them.
 */
export function getDisplayPosition(report) {
  if (report.verified_latitude && report.verified_longitude) {
    return [Number(report.verified_latitude), Number(report.verified_longitude)]
  }
  return [Number(report.latitude), Number(report.longitude)]
}

export function hasVerifiedLocation(report) {
  return Boolean(report.verified_latitude && report.verified_longitude)
}