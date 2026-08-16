import { supabase } from './supabase'

function extractStoragePath(publicUrl, bucket) {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = publicUrl?.indexOf(marker) ?? -1
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}

/**
 * Deletes a hazard report entirely: its uploaded photos from Storage,
 * and the database row itself. Related rows (hazard_images,
 * hazard_detection_results, inspector_assignments, notifications tied
 * to this report) are removed automatically via ON DELETE CASCADE set
 * up in the schema — no need to delete them manually here.
 *
 * @param {object} report - must include report_id, user_id, title, and hazard_images (array with image_url)
 * @param {object} [options]
 * @param {boolean} [options.notifyUser] - if true, sends the reporter a notification before deleting
 * @param {string} [options.reason] - included in that notification, if provided
 */
export async function deleteHazardReport(report, options = {}) {
  const { notifyUser = false, reason = '' } = options

  // Best-effort cleanup of the citizen's uploaded photos — if this fails,
  // we still proceed with deleting the report itself rather than blocking.
  const paths = (report.hazard_images || [])
    .map((img) => extractStoragePath(img.image_url, 'hazard-images'))
    .filter(Boolean)

  if (paths.length > 0) {
    await supabase.storage.from('hazard-images').remove(paths)
  }

  // Notify BEFORE deleting, and deliberately with report_id left out —
  // the notifications table cascades-deletes when its report is deleted,
  // so a notification tied to this report_id would vanish along with it.
  if (notifyUser && report.user_id) {
    await supabase.from('notifications').insert({
      user_id: report.user_id,
      title: 'Report Deleted',
      message: reason
        ? `Your hazard report "${report.title || 'Untitled hazard report'}" was removed by an administrator. Reason: ${reason}`
        : `Your hazard report "${report.title || 'Untitled hazard report'}" was removed by an administrator.`,
    })
  }

  const { error } = await supabase.from('hazard_reports').delete().eq('report_id', report.report_id)
  return { error }
}