/**
 * Builds a usable AI-Assisted Report draft from data the app already has.
 *
 * This is a last-resort fallback for when the Gemini Edge Function is
 * unreachable or rate-limited. It is NOT presented as AI output: the saved
 * object carries `generated_by: 'local_fallback'` so the UI can label it
 * clearly and the admin can regenerate once the service is back.
 */

function titleCase(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

function confidenceText(score) {
  const value = Number(score)
  if (!Number.isFinite(value) || value <= 0) return ''
  return ` with ${Math.round(value)}% model confidence`
}

function actionFor(severity) {
  switch (String(severity).toLowerCase()) {
    case 'severe':
      return 'Barricade or sign the area immediately and schedule an urgent field inspection. Prioritize temporary patching or resurfacing to prevent vehicle damage and injury, then plan a permanent repair.'
    case 'moderate':
      return 'Schedule a field inspection within 48 hours. Place a warning marker at the location and include the permanent repair in the next maintenance cycle.'
    case 'low':
      return 'Add the location to the routine maintenance list and re-inspect after the next rainy season or when nearby works are scheduled.'
    default:
      return 'Assign a field inspector to verify the hazard, confirm the severity on site, and schedule the appropriate repair.'
  }
}

export function buildLocalReportDraft({ report, detection } = {}) {
  const hazardType = titleCase(detection?.hazard_type || 'road hazard')
  const severity = titleCase(detection?.severity_level || report?.severity || 'unassessed')
  const confidence = confidenceText(detection?.confidence_score)
  const notes = detection?.detection_notes?.trim()
  const description = report?.description?.trim() || 'No citizen description was provided.'
  const latitude = Number(report?.latitude)
  const longitude = Number(report?.longitude)
  const location =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : 'the reported location'

  return {
    executive_summary:
      `This draft covers a citizen-reported ${hazardType.toLowerCase()} at ${location}. ` +
      `The computer-vision assessment rated it ${severity.toLowerCase()}${confidence}. ` +
      'The report is awaiting field verification by an LGU inspector.',
    hazard_description: notes ? `${description} Detection notes: ${notes}` : description,
    severity_assessment:
      `The hazard was classified as ${severity.toLowerCase()}${confidence}. ` +
      'This rating reflects the visible road damage and must be confirmed on site before repair work is scheduled.',
    recommended_action: actionFor(severity),
    generated_by: 'local_fallback',
    generated_at: new Date().toISOString(),
  }
}
