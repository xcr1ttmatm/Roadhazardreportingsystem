// Shared status display config — used anywhere a hazard_reports.status badge is shown
// (citizen "My Reports", admin monitoring, inspector views, etc.)

export const STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
  under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-700' },
  verified: { label: 'Verified', className: 'bg-indigo-100 text-indigo-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-[#CE1126]/10 text-[#CE1126]' },
}

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
}