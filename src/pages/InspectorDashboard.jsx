import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Loader2,
  CheckCircle2,
  ClipboardList,
  MapPin,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import FilterTabs from '../components/ui/FilterTabs'
import SearchInput from '../components/ui/SearchInput'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import DonutChart from '../components/ui/charts/DonutChart'
import { cn } from '../components/ui/utils'

const FILTERS = ['all', 'pending', 'accepted', 'completed']

const ASSIGNMENT_LABELS = {
  pending: 'Pending',
  accepted: 'In Progress',
  completed: 'Completed',
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function InspectorDashboard() {
  const { user, profile } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

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

  const counts = assignments.reduce(
    (acc, assignment) => {
      if (acc[assignment.assignment_status] !== undefined) acc[assignment.assignment_status] += 1
      return acc
    },
    { pending: 0, accepted: 0, completed: 0 }
  )

  const byStatus = filter === 'all' ? assignments : assignments.filter((a) => a.assignment_status === filter)
  const searchTerm = query.trim().toLowerCase()
  const filtered = searchTerm
    ? byStatus.filter((a) => (a.report?.title || 'Untitled hazard report').toLowerCase().includes(searchTerm))
    : byStatus

  const statusData = [
    { label: 'Pending', value: counts.pending, color: '#94a3b8' },
    { label: 'In Progress', value: counts.accepted, color: '#2563eb' },
    { label: 'Completed', value: counts.completed, color: '#7c3aed' },
  ]

  const filterOptions = FILTERS.map((value) => ({
    value,
    label: value === 'all' ? 'All' : ASSIGNMENT_LABELS[value],
    count: value === 'all' ? assignments.length : counts[value],
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Field Operations"
        title={`Welcome, ${profile?.username ?? 'Inspector'}`}
        description="Reports assigned to you for on-site inspection and verification."
        icon={ClipboardCheck}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending"
          value={counts.pending}
          icon={Clock}
          tone="slate"
          hint="Awaiting your response"
          loading={loading}
        />
        <StatCard
          label="In Progress"
          value={counts.accepted}
          icon={Loader2}
          tone="blue"
          hint="Accepted field assignments"
          loading={loading}
        />
        <StatCard
          label="Completed"
          value={counts.completed}
          icon={CheckCircle2}
          tone="green"
          hint="Inspections submitted"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {/* Assignments list */}
        <Card className="p-5 xl:col-span-3">
          <CardHeader
            title="My assignments"
            description="Open an assignment to review the hazard and submit your findings."
            icon={ClipboardList}
            action={
              <span className="rounded-full bg-primary-light/60 px-2.5 py-1 text-[10px] font-bold text-primary">
                {assignments.length} total
              </span>
            }
          />

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterTabs options={filterOptions} value={filter} onChange={setFilter} className="w-full lg:w-auto" />
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search assignments…"
              className="w-full lg:max-w-xs"
            />
          </div>

          <div className="mt-4">
            {loading ? (
              <LoadingState rows={3} label="Loading assignments…" />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title={searchTerm ? 'No matching assignments' : 'No assignments in this category'}
                description={
                  searchTerm
                    ? 'Try a different search term or clear the search box.'
                    : 'New assignments from the LGU will appear here.'
                }
              />
            ) : (
              <div className="space-y-2.5">
                {filtered.map((assignment) => {
                  const thumbnail = assignment.report?.hazard_images?.[0]?.image_url

                  return (
                    <Link
                      key={assignment.assignment_id}
                      to={`/inspector/reports/${assignment.report_id}`}
                      className="group flex items-center gap-3.5 rounded-xl border border-line bg-white p-3 transition hover:border-primary/30 hover:bg-primary-light/10 hover:shadow-soft"
                    >
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-line"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink-muted">
                          <MapPin className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink transition group-hover:text-primary">
                          {assignment.report?.title || 'Untitled hazard report'}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
                          <Calendar className="h-3 w-3" />
                          Assigned {formatDate(assignment.assigned_at)}
                        </div>
                      </div>

                      <StatusBadge status={assignment.assignment_status} />

                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Breakdown */}
        <Card className="p-5 xl:col-span-1">
          <CardHeader title="Workload" description="Your assignment status at a glance." icon={ClipboardCheck} />
          <div className="mt-5">
            {loading ? <LoadingState label="Loading…" /> : <DonutChart data={statusData} centerLabel="Tasks" />}
          </div>

          <div className={cn('mt-5 rounded-xl bg-gradient-to-br from-primary-light/60 to-secondary-light/50 p-3.5')}>
            <p className="text-[11px] font-semibold text-ink">Pending first</p>
            <p className="mt-1 text-2xl font-bold leading-none text-ink">{counts.pending}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-soft">
              New assignments awaiting your acceptance and site visit.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
