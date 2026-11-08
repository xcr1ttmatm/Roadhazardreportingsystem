import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FilePlus,
  ListChecks,
  Map,
  MapPin,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Camera,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader } from '../components/ui/Card'
import { buttonClasses } from '../components/ui/buttonStyles'
import { StatusBadge, SeverityBadge } from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import DonutChart from '../components/ui/charts/DonutChart'
import { cn } from '../components/ui/utils'

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const QUICK_ACTIONS = [
  {
    to: '/citizen/report/new',
    icon: FilePlus,
    iconWrap: 'bg-primary-light text-primary',
    title: 'Submit a Report',
    description: 'Spotted a pothole or road damage? Report it with a photo and location pin.',
    cta: 'Start a report',
  },
  {
    to: '/citizen/reports',
    icon: ListChecks,
    iconWrap: 'bg-secondary-light text-secondary',
    title: 'Track My Reports',
    description: "Check the status of hazards you've reported and see updates.",
    cta: 'View my reports',
  },
  {
    to: '/citizen/map',
    icon: Map,
    iconWrap: 'bg-accent-light text-accent',
    title: 'Hazard Map',
    description: 'View all LGU-verified road hazards across Iligan City.',
    cta: 'Open the map',
  },
]

export default function CitizenDashboard() {
  const { user, profile } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchReports() {
      // Additive read-only query used only for the dashboard summary.
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('report_id, title, status, severity, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) setReports(data ?? [])
      setLoading(false)
    }

    fetchReports()
  }, [user])

  const counts = reports.reduce(
    (acc, report) => {
      acc.total += 1
      if (acc[report.status] !== undefined) acc[report.status] += 1
      return acc
    },
    { total: 0, pending: 0, under_review: 0, verified: 0, approved: 0, rejected: 0, resolved: 0 }
  )

  const statusData = [
    { label: 'Pending', value: counts.pending, color: '#94a3b8' },
    { label: 'Under Review', value: counts.under_review, color: '#2563eb' },
    { label: 'Verified', value: counts.verified, color: '#4f46e5' },
    { label: 'Approved', value: counts.approved, color: '#7c3aed' },
    { label: 'Rejected', value: counts.rejected, color: '#dc2626' },
  ]

  const recent = reports.slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Citizen Portal"
        title={`Welcome, ${profile?.username ?? 'Citizen'}`}
        description="Report road hazards in your community and follow them from submission to resolution."
        icon={Sparkles}
        actions={
          <Link to="/citizen/report/new" className={buttonClasses({ variant: 'gradient' })}>
            <FilePlus className="h-4 w-4" />
            Submit a Report
          </Link>
        }
      />

      {/* Hero */}
      <Card tone="gradient" className="relative overflow-hidden p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/85 ring-1 ring-inset ring-white/20">
              <Camera className="h-3 w-3" />
              Photo + location reporting
            </span>
            <h2 className="mt-3 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
              Every hazard you report helps make the roads safer.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Your reports are reviewed by the local government unit and verified on-site by field inspectors.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Link
              to="/citizen/report/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90"
            >
              <FilePlus className="h-4 w-4" />
              New report
            </Link>
            <Link
              to="/citizen/reports"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20"
            >
              <ListChecks className="h-4 w-4" />
              My reports
            </Link>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My Reports"
          value={counts.total}
          icon={ListChecks}
          tone="blue"
          hint="Reports you have submitted"
          loading={loading}
        />
        <StatCard
          label="In Review"
          value={counts.pending + counts.under_review}
          icon={Clock}
          tone="amber"
          hint="Pending or being assessed"
          loading={loading}
        />
        <StatCard
          label="Approved"
          value={counts.approved + counts.resolved}
          icon={CheckCircle2}
          tone="green"
          hint="Confirmed by the LGU"
          loading={loading}
        />
        <StatCard
          label="Verified"
          value={counts.verified}
          icon={ShieldCheck}
          tone="indigo"
          hint="Inspected and awaiting decision"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Status breakdown */}
        <Card className="p-5 xl:col-span-2">
          <CardHeader
            title="Your report status"
            description="Where each of your submissions currently stands."
            icon={ListChecks}
          />
          <div className="mt-5">
            {loading ? (
              <LoadingState label="Loading your breakdown…" />
            ) : (
              <DonutChart data={statusData} centerLabel="Reports" />
            )}
          </div>
        </Card>

        {/* Recent reports */}
        <Card className="p-5 xl:col-span-3">
          <CardHeader
            title="Recent submissions"
            description="Your five most recent reports."
            icon={FilePlus}
            action={
              reports.length > 0 ? (
                <Link to="/citizen/reports" className="text-xs font-semibold text-primary hover:underline">
                  View all
                </Link>
              ) : null
            }
          />

          <div className="mt-4">
            {loading ? (
              <LoadingState rows={3} label="Loading your reports…" />
            ) : recent.length === 0 ? (
              <EmptyState
                icon={FilePlus}
                title="You haven't submitted any reports yet"
                description="Spotted a pothole or road damage? Submit your first report with a photo and location."
                action={
                  <Link to="/citizen/report/new" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                    <FilePlus className="h-3.5 w-3.5" />
                    Submit a report
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {recent.map((report) => (
                  <Link
                    key={report.report_id}
                    to="/citizen/reports"
                    className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-primary/30 hover:bg-primary-light/15"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light/70 text-primary">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {report.title || 'Untitled hazard report'}
                      </span>
                      <span className="block text-[10px] font-medium text-ink-muted">
                        {formatDate(report.created_at)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <SeverityBadge severity={report.severity} />
                      <StatusBadge status={report.status} />
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-float"
          >
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', action.iconWrap)}>
              <action.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-ink">{action.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{action.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {action.cta}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
