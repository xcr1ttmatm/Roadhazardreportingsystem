import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, User, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  under_review: 'bg-blue-100 text-blue-700',
  verified: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-[#CE1126]',
  resolved: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  resolved: 'Resolved',
}

const FILTERS = ['all', 'pending', 'under_review', 'verified', 'approved', 'rejected', 'resolved']

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MonitorReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function fetchReports() {
      // Note: hazard_reports has 3 FKs to users (user_id, verified_by, approved_by),
      // so we must specify which one via !constraint_name to avoid an ambiguous embed.
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*, reporter:users!hazard_reports_user_id_fkey(username, email), hazard_images(image_url)')
        .order('created_at', { ascending: false })

      if (!error) setReports(data)
      setLoading(false)
    }

    fetchReports()
  }, [])

  const filteredReports = filter === 'all' ? reports : reports.filter((r) => r.status === filter)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0F4C81]">Monitor Hazard Reports</h1>
      <p className="mt-1 text-sm text-gray-500">All reports submitted by citizens across Iligan City.</p>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f ? 'bg-[#0F4C81] text-white' : 'bg-white text-gray-500 hover:bg-gray-100'
            } border border-gray-200`}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-gray-400">Loading reports...</p>
      ) : filteredReports.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <p className="text-sm text-gray-500">No reports in this category.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filteredReports.map((report) => {
            const thumbnail = report.hazard_images?.[0]?.image_url

            return (
              <Link
                key={report.report_id}
                to={`/admin/reports/${report.report_id}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition hover:shadow-md"
              >
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-100" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#0F4C81]">
                    {report.title || 'Untitled hazard report'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {report.reporter?.username ?? 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[report.status]}`}
                >
                  {STATUS_LABELS[report.status]}
                </span>

                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}