import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Map,
  ArrowUpRight,
  Activity,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader } from '../components/ui/Card'
import { buttonClasses } from '../components/ui/buttonStyles'
import { StatusBadge } from '../components/ui/Badge'
import DataTable from '../components/ui/DataTable'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import DonutChart from '../components/ui/charts/DonutChart'
import BarChart from '../components/ui/charts/BarChart'
import { cn } from '../components/ui/utils'

function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function buildWeek(rows) {
  const today = startOfDay(new Date())
  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (6 - index))
    const next = new Date(day)
    next.setDate(day.getDate() + 1)
    const value = rows.filter((row) => {
      const created = new Date(row.created_at)
      return created >= day && created < next
    }).length
    return { label: day.toLocaleDateString('en-PH', { weekday: 'short' }), value }
  })
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [counts, setCounts] = useState(null)
  const [recent, setRecent] = useState([])
  const [week, setWeek] = useState([])
  const [overviewLoading, setOverviewLoading] = useState(true)

  useEffect(() => {
    async function fetchCounts() {
      const { data, error } = await supabase.from('hazard_reports').select('status')
      if (error) return

      const result = {
        total: data.length,
        pending: 0,
        under_review: 0,
        verified: 0,
        approved: 0,
        rejected: 0,
      }
      data.forEach((r) => {
        if (result[r.status] !== undefined) result[r.status] += 1
      })
      setCounts(result)
    }

    // Additive read-only query for the overview widgets (no API/backend changes).
    async function fetchOverview() {
      const weekStart = new Date(startOfDay(new Date()))
      weekStart.setDate(weekStart.getDate() - 6)

      const [recentResult, weekResult] = await Promise.all([
        supabase
          .from('hazard_reports')
          .select('report_id, title, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('hazard_reports')
          .select('created_at')
          .gte('created_at', weekStart.toISOString()),
      ])

      if (!recentResult.error) setRecent(recentResult.data ?? [])
      if (!weekResult.error) setWeek(buildWeek(weekResult.data ?? []))
      setOverviewLoading(false)
    }

    fetchCounts()
    fetchOverview()
  }, [])

  const loading = counts === null

  const statusData = counts
    ? [
        { label: 'Pending', value: counts.pending, color: '#94a3b8' },
        { label: 'Under Review', value: counts.under_review, color: '#2563eb' },
        { label: 'Verified', value: counts.verified, color: '#4f46e5' },
        { label: 'Approved', value: counts.approved, color: '#7c3aed' },
        { label: 'Rejected', value: counts.rejected, color: '#dc2626' },
      ]
    : []

  const recentColumns = [
    {
      key: 'report',
      header: 'Report',
      render: (report) => (
        <Link to={`/admin/reports/${report.report_id}`} className="group block min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink transition group-hover:text-primary">
            {report.title || 'Untitled hazard report'}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
            #{String(report.report_id).slice(0, 8)}
          </p>
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (report) => <StatusBadge status={report.status} />,
    },
    {
      key: 'created',
      header: 'Submitted',
      render: (report) => <span className="text-xs text-ink-soft">{formatDate(report.created_at)}</span>,
    },
    {
      key: 'action',
      header: '',
      className: 'w-10',
      render: (report) => (
        <Link
          to={`/admin/reports/${report.report_id}`}
          aria-label="Open report"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-primary-light/60 hover:text-primary"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard Overview"
        title={`Welcome back, ${profile?.username ?? 'Admin'}`}
        description="A live overview of hazard reports, decisions, and field activity across Iligan City."
        icon={Activity}
        actions={
          <>
            <Link to="/admin/reports" className={buttonClasses({ variant: 'gradient' })}>
              <ClipboardList className="h-4 w-4" />
              Monitor Reports
            </Link>
            <Link to="/admin/map" className={buttonClasses({ variant: 'secondary' })}>
              <Map className="h-4 w-4" />
              Hazard Map
            </Link>
          </>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Reports"
          value={counts?.total ?? '—'}
          icon={ClipboardList}
          variant="blue"
          hint="All hazard reports submitted"
          loading={loading}
        />
        <StatCard
          label="Approved"
          value={counts?.approved ?? '—'}
          icon={CheckCircle2}
          variant="purple"
          hint="Visible on the public map"
          loading={loading}
        />
        <StatCard
          label="Pending"
          value={counts?.pending ?? '—'}
          icon={Clock}
          tone="slate"
          hint="Waiting for initial review"
          loading={loading}
        />
        <StatCard
          label="Under Review"
          value={counts?.under_review ?? '—'}
          icon={Search}
          tone="blue"
          hint="Currently being assessed"
          loading={loading}
        />
        <StatCard
          label="Rejected"
          value={counts?.rejected ?? '—'}
          icon={XCircle}
          tone="red"
          hint="Closed without publication"
          loading={loading}
        />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-2">
          <CardHeader
            title="Reports by status"
            description="Share of every report in the system."
            icon={Activity}
          />
          <div className="mt-5">
            {loading ? <LoadingState label="Loading status breakdown…" /> : <DonutChart data={statusData} centerLabel="Reports" />}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardHeader
              title="Reporting activity"
              description="Reports submitted over the last 7 days."
              icon={ClipboardList}
            />
            <span className="rounded-full bg-primary-light/60 px-2.5 py-1 text-[10px] font-bold text-primary">
              Last 7 days
            </span>
          </div>
          <div className="mt-6">
            {overviewLoading ? (
              <LoadingState label="Loading activity…" />
            ) : (
              <BarChart data={week.length ? week : buildWeek([])} unit="reports" />
            )}
          </div>
        </Card>
      </div>

      {/* Recent + quick actions */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-3">
          <CardHeader
            title="Recent reports"
            description="The latest submissions from citizens."
            icon={ClipboardList}
            action={
              <Link to="/admin/reports" className="text-xs font-semibold text-primary hover:underline">
                View all
              </Link>
            }
          />
          <div className="mt-4">
            {overviewLoading ? (
              <LoadingState rows={3} label="Loading recent reports…" />
            ) : (
              <DataTable
                columns={recentColumns}
                rows={recent}
                rowKey="report_id"
                empty={
                  <EmptyState
                    icon={ClipboardList}
                    title="No reports yet"
                    description="Citizen submissions will appear here as soon as they arrive."
                  />
                }
                renderMobile={(report) => (
                  <Link
                    key={report.report_id}
                    to={`/admin/reports/${report.report_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {report.title || 'Untitled hazard report'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">{formatDate(report.created_at)}</p>
                    </div>
                    <StatusBadge status={report.status} />
                  </Link>
                )}
              />
            )}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <CardHeader title="Quick actions" description="Jump straight into daily admin work." icon={Users} />
          <div className="mt-4 space-y-2.5">
            <Link
              to="/admin/reports"
              className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-primary/30 hover:bg-primary-light/20"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">
                <ClipboardList className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-ink">Review hazard reports</span>
                <span className="block text-[10px] text-ink-muted">Approve, reject, or assign field work</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-muted transition group-hover:text-primary" />
            </Link>

            <Link
              to="/admin/inspectors"
              className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-secondary/30 hover:bg-secondary-light/20"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-light text-secondary">
                <Users className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-ink">Manage staff accounts</span>
                <span className="block text-[10px] text-ink-muted">Create inspectors and administrators</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-muted transition group-hover:text-secondary" />
            </Link>

            <Link
              to="/admin/map"
              className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-accent/30 hover:bg-accent-light/20"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent">
                <Map className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-ink">Open the hazard map</span>
                <span className="block text-[10px] text-ink-muted">See approved hazards city-wide</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-muted transition group-hover:text-accent" />
            </Link>
          </div>

          <div className={cn('mt-4 rounded-xl bg-gradient-to-br from-primary-light/60 to-secondary-light/50 p-3.5')}>
            <p className="text-[11px] font-semibold text-ink">Verified reports</p>
            <p className="mt-1 text-2xl font-bold leading-none text-ink">{counts?.verified ?? '—'}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-soft">
              Reports with completed inspector findings waiting for a final decision.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
