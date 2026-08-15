import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronRight } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const ASSIGNMENT_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  accepted: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}

const ASSIGNMENT_LABELS = {
  pending: 'Pending',
  accepted: 'In Progress',
  completed: 'Completed',
}

const FILTERS = ['all', 'pending', 'accepted', 'completed']

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function InspectorDashboard() {
  const { user, profile } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return

    async function fetchAssignments() {
      const { data, error } = await supabase
        .from('inspector_assignments')
        .select('*, report:hazard_reports!inspector_assignments_report_id_fkey(report_id, title, status, hazard_images(image_url))')
        .eq('assigned_to', user.id)
        .order('assigned_at', { ascending: false })

      if (!error) setAssignments(data)
      setLoading(false)
    }

    fetchAssignments()
  }, [user])

  const filtered = filter === 'all' ? assignments : assignments.filter((a) => a.assignment_status === filter)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0F4C81]">Welcome, {profile?.username}</h1>
      <p className="mt-1 text-sm text-gray-500">Reports assigned to you for on-site inspection.</p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f ? 'bg-[#0F4C81] text-white' : 'bg-white text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? 'All' : ASSIGNMENT_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-gray-400">Loading assignments...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <p className="text-sm text-gray-500">No assignments in this category.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((a) => {
            const thumbnail = a.report?.hazard_images?.[0]?.image_url

            return (
              <Link
                key={a.assignment_id}
                to={`/inspector/reports/${a.report_id}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition hover:shadow-md"
              >
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-100" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#0F4C81]">{a.report?.title || 'Untitled hazard report'}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    Assigned {formatDate(a.assigned_at)}
                  </div>
                </div>

                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ASSIGNMENT_STYLES[a.assignment_status]}`}>
                  {ASSIGNMENT_LABELS[a.assignment_status]}
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