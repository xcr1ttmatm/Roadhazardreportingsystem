// Shared report-status display logic.
//
// The database keeps the simple status sequence (pending -> under_review ->
// verified -> approved/rejected/resolved). "For Inspection" is a display-only
// state derived from an active, not-yet-accepted inspector assignment, so no
// schema change or extra status value is needed.

export const REPORT_STATUS_CONFIG = {
  pending: { label: 'Pending', tone: 'neutral' },
  under_review: { label: 'Under Review', tone: 'blue' },
  verified: { label: 'Verified', tone: 'indigo' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  resolved: { label: 'Resolved', tone: 'success' },
  // Assignment statuses are shown with the same badge component.
  accepted: { label: 'In Progress', tone: 'blue' },
  completed: { label: 'Completed', tone: 'success' },
  // Derived, display-only state.
  for_inspection: { label: 'For Inspection', tone: 'warning' },
}

export function getReportStatusConfig(status, assignmentStatus) {
  if ((status === 'pending' || status === 'under_review') && assignmentStatus === 'pending') {
    return REPORT_STATUS_CONFIG.for_inspection
  }
  return REPORT_STATUS_CONFIG[status] ?? REPORT_STATUS_CONFIG.pending
}

/** The newest assignment wins, so a reassigned report shows its current inspector. */
export function latestAssignment(report) {
  const list = report?.inspector_assignments
  if (!Array.isArray(list) || list.length === 0) return null
  return list.reduce((newest, current) =>
    new Date(current.assigned_at || 0) > new Date(newest.assigned_at || 0) ? current : newest
  )
}
