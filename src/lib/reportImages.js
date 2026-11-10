/**
 * Builds the Before/After photo sets for a report. "Before" leads with
 * whichever photo the admin picked as featured at approval time; "After" comes
 * from resolved_images, falling back to the older single resolved_image_url
 * pointer for reports resolved before that table existed.
 *
 * Shared by the desktop map popup and the mobile report sheet so both always
 * show the same photos in the same order.
 */
export function getBeforeAfterImages(report) {
  const rawBefore = report.featured_image_url
    ? [report.featured_image_url, ...(report.hazard_images || []).map((i) => i.image_url).filter((u) => u !== report.featured_image_url)]
    : (report.hazard_images || []).map((i) => i.image_url)

  const rawAfter =
    report.resolved_images && report.resolved_images.length > 0
      ? report.resolved_images.map((i) => i.image_url)
      : report.resolved_image_url
        ? [report.resolved_image_url]
        : []

  return {
    before: rawBefore.map((url) => ({ url, label: 'Before' })),
    after: rawAfter.map((url) => ({ url, label: 'After' })),
  }
}
