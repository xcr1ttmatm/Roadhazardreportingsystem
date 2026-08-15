import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { MapPin, Calendar, ChevronDown } from 'lucide-react'

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  under_review: 'bg-blue-100 text-blue-700',
  verified: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-[#CE1126]',
}

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function TrackReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!user) return

    async function fetchReports() {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*, hazard_images(image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) setReports(data)
      setLoading(false)
    }

    fetchReports()
  }, [user])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0F4C81]">My Reports</h1>
      <p className="mt-1 text-sm text-gray-500">Track the status of hazards you've reported.</p>

      {loading ? (
        <p className="mt-8 text-sm text-gray-400">Loading your reports...</p>
      ) : reports.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <p className="text-sm text-gray-500">You haven't submitted any reports yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {reports.map((report) => {
            const isExpanded = expandedId === report.report_id
            const thumbnail = report.hazard_images?.[0]?.image_url

            return (
              <div
                key={report.report_id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.report_id)}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left"
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
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {formatDate(report.created_at)}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[report.status]}`}
                  >
                    {STATUS_LABELS[report.status]}
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    <p className="text-sm text-gray-600">{report.description}</p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}
                    </div>

                    {report.status === 'rejected' && report.rejection_reason && (
                      <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-[#CE1126]">
                        <span className="font-medium">Reason for rejection: </span>
                        {report.rejection_reason}
                      </div>
                    )}

                    {/* simple status timeline */}
                    <div className="mt-4 space-y-2 border-l-2 border-gray-100 pl-4">
                      <TimelineStep label="Submitted" date={report.created_at} done />
                      <TimelineStep
                        label="Verified by inspector"
                        date={report.verified_at}
                        done={!!report.verified_at}
                      />
                      <TimelineStep
                        label={report.status === 'rejected' ? 'Rejected' : 'Approved'}
                        date={report.approved_at}
                        done={!!report.approved_at}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimelineStep({ label, date, done }) {
  return (
    <div className="relative">
      <span
        className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
          done ? 'bg-[#0F4C81]' : 'bg-gray-200'
        }`}
      />
      <p className={`text-sm ${done ? 'text-[#0F4C81]' : 'text-gray-400'}`}>{label}</p>
      {date && <p className="text-xs text-gray-400">{formatDate(date)}</p>}
    </div>
  )
}