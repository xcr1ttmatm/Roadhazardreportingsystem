import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Calendar, User, Trash2, ClipboardList, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { deleteHazardReport } from '../lib/deleteReport'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import { buttonClasses } from '../components/ui/buttonStyles'
import FilterTabs from '../components/ui/FilterTabs'
import SearchInput from '../components/ui/SearchInput'
import Pagination from '../components/ui/Pagination'
import DataTable from '../components/ui/DataTable'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { Textarea } from '../components/ui/Field'

const FILTERS = ['all', 'pending', 'under_review', 'verified', 'approved', 'rejected', 'resolved']

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  resolved: 'Resolved',
}

const PAGE_SIZE = 8

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MonitorReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function fetchReports() {
    const { data, error } = await supabase
      .from('hazard_reports')
      .select('*, reporter:users!hazard_reports_user_id_fkey(username, email), hazard_images(image_url)')
      .order('created_at', { ascending: false })

    if (!error) setReports(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [])

  async function handleDelete(report) {
    if (!deleteReason.trim()) {
      toast.error('Please give a reason so the citizen understands why')
      return
    }
    setDeleting(true)
    try {
      const { error } = await deleteHazardReport(report, { notifyUser: true, reason: deleteReason.trim() })
      if (error) throw error
      toast.success('Report deleted')
      setReports((prev) => prev.filter((r) => r.report_id !== report.report_id))
      setConfirmDeleteId(null)
      setDeleteReason('')
    } catch (err) {
      toast.error(err.message || 'Could not delete report')
    } finally {
      setDeleting(false)
    }
  }

  function closeDeleteModal() {
    setConfirmDeleteId(null)
    setDeleteReason('')
  }

  const counts = reports.reduce((acc, report) => {
    acc[report.status] = (acc[report.status] ?? 0) + 1
    return acc
  }, {})

  const filterOptions = FILTERS.map((value) => ({
    value,
    label: value === 'all' ? 'All' : STATUS_LABELS[value],
    count: value === 'all' ? reports.length : counts[value] ?? 0,
  }))

  const byStatus = filter === 'all' ? reports : reports.filter((r) => r.status === filter)
  const searchTerm = query.trim().toLowerCase()
  const searched = searchTerm
    ? byStatus.filter((report) => {
        const haystack = [report.title, report.description, report.reporter?.username, report.reporter?.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(searchTerm)
      })
    : byStatus

  const pageCount = Math.max(1, Math.ceil(searched.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paginated = searched.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const deleteTarget = reports.find((report) => report.report_id === confirmDeleteId) ?? null

  const columns = [
    {
      key: 'report',
      header: 'Report',
      render: (report) => {
        const thumbnail = report.hazard_images?.[0]?.image_url
        return (
          <Link to={`/admin/reports/${report.report_id}`} className="group flex min-w-0 items-center gap-3">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-line"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-muted">
                <ClipboardList className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block max-w-[240px] truncate text-[13px] font-semibold text-ink transition group-hover:text-primary">
                {report.title || 'Untitled hazard report'}
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                #{String(report.report_id).slice(0, 8)}
              </span>
            </span>
          </Link>
        )
      },
    },
    {
      key: 'reporter',
      header: 'Reporter',
      render: (report) => (
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <User className="h-3.5 w-3.5 text-ink-muted" />
          {report.reporter?.username ?? 'Unknown'}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Submitted',
      render: (report) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-soft">
          <Calendar className="h-3.5 w-3.5 text-ink-muted" />
          {formatDate(report.created_at)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (report) => <StatusBadge status={report.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      headerClassName: 'text-right',
      render: (report) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/admin/reports/${report.report_id}`}
            aria-label="Open report"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-primary-light/60 hover:text-primary"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDeleteId(report.report_id)}
            aria-label="Delete report"
            title="Delete report"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-danger-light hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Monitor Hazard Reports"
        description="All reports submitted by citizens across Iligan City."
        icon={ClipboardList}
        actions={
          <span className="rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft shadow-soft">
            {reports.length} total report{reports.length === 1 ? '' : 's'}
          </span>
        }
      />

      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            options={filterOptions}
            value={filter}
            onChange={(value) => {
              setFilter(value)
              setPage(1)
            }}
            className="w-full lg:w-auto"
          />
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            placeholder="Search reports or reporters…"
            className="w-full lg:max-w-sm"
          />
        </div>

        <div className="mt-4">
          {loading ? (
            <LoadingState rows={5} label="Loading reports…" />
          ) : searched.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={searchTerm || filter !== 'all' ? 'No matching reports' : 'No reports yet'}
              description={
                searchTerm || filter !== 'all'
                  ? 'Try a different search term or clear the status filter.'
                  : 'Citizen submissions will appear here as soon as they arrive.'
              }
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={paginated}
                rowKey="report_id"
                renderMobile={(report) => {
                  const thumbnail = report.hazard_images?.[0]?.image_url
                  return (
                    <div key={report.report_id} className="rounded-2xl border border-line bg-white p-3.5 shadow-soft">
                      <div className="flex items-start gap-3">
                        {thumbnail ? (
                          <img src={thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-muted">
                            <ClipboardList className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/admin/reports/${report.report_id}`}
                            className="block truncate text-[13px] font-semibold text-ink"
                          >
                            {report.title || 'Untitled hazard report'}
                          </Link>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                            <User className="h-3 w-3" />
                            {report.reporter?.username ?? 'Unknown'}
                            <span aria-hidden="true">·</span>
                            {formatDate(report.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={report.status} />
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-line-soft pt-2.5">
                        <Link
                          to={`/admin/reports/${report.report_id}`}
                          className={buttonClasses({ variant: 'secondary', size: 'xs' })}
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(report.report_id)}
                          className={buttonClasses({ variant: 'secondary-danger', size: 'xs' })}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                }}
              />

              <Pagination
                page={currentPage}
                pageCount={pageCount}
                onChange={setPage}
                total={searched.length}
                pageSize={PAGE_SIZE}
                className="mt-4"
              />
            </>
          )}
        </div>
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={closeDeleteModal}
        title="Delete this report?"
        description="The citizen will be notified with the reason you provide."
        footer={
          <>
            <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)} loading={deleting}>
              {deleting ? 'Deleting…' : 'Confirm Delete'}
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl bg-danger-light/70 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">
                  {deleteTarget.title || 'Untitled hazard report'}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  Submitted by {deleteTarget.reporter?.username ?? 'Unknown'} on{' '}
                  {formatDate(deleteTarget.created_at)}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="delete-reason" className="mb-1.5 block text-[13px] font-semibold text-ink">
                Reason for deletion <span className="text-danger">*</span>
              </label>
              <Textarea
                id="delete-reason"
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. duplicate report, spam, not an actual road hazard"
              />
              <p className="mt-1.5 text-xs text-ink-muted">The citizen will see this reason.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
