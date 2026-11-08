import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { UserPlus, ShieldCheck, HardHat, Mail, Calendar, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Field'
import { RoleBadge } from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import SearchInput from '../components/ui/SearchInput'
import Pagination from '../components/ui/Pagination'
import DataTable from '../components/ui/DataTable'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'

const PAGE_SIZE = 8

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ManageUsers() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState('inspector')

  async function fetchStaff() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('user_type', ['inspector', 'admin'])
      .order('created_at', { ascending: false })

    if (!error) setStaff(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  function resetForm() {
    setUsername('')
    setEmail('')
    setPassword('')
    setUserType('inspector')
  }

  function closeForm() {
    setShowForm(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data, error } = await supabase.functions.invoke('create-staff-account', {
        body: { username, email, password, userType },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success(`${userType === 'admin' ? 'Admin' : 'Inspector'} account created`)
      resetForm()
      setShowForm(false)
      fetchStaff()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Could not create account')
    } finally {
      setSubmitting(false)
    }
  }

  const adminCount = staff.filter((person) => person.user_type === 'admin').length
  const inspectorCount = staff.filter((person) => person.user_type === 'inspector').length

  const searchTerm = query.trim().toLowerCase()
  const searched = searchTerm
    ? staff.filter((person) =>
        [person.username, person.email, person.full_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      )
    : staff

  const pageCount = Math.max(1, Math.ceil(searched.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paginated = searched.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const columns = [
    {
      key: 'person',
      header: 'Staff member',
      render: (person) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={person.full_name || person.username} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{person.username}</p>
            <p className="truncate text-[11px] text-ink-muted">{person.full_name || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (person) => (
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Mail className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
          <span className="truncate">{person.email}</span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (person) => <RoleBadge role={person.user_type} />,
    },
    {
      key: 'created',
      header: 'Added',
      render: (person) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-soft">
          <Calendar className="h-3.5 w-3.5 text-ink-muted" />
          {formatDate(person.created_at)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Manage Staff"
        description="Create and view Inspector and Admin accounts."
        icon={Users}
        actions={
          <Button variant="gradient" icon={UserPlus} onClick={() => setShowForm(true)}>
            New Staff Account
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
            <Users className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-ink-soft">Total staff</p>
            <p className="text-xl font-bold leading-none text-ink">{loading ? '—' : staff.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-light text-secondary">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-ink-soft">Administrators</p>
            <p className="text-xl font-bold leading-none text-ink">{loading ? '—' : adminCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-light text-warning">
            <HardHat className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-ink-soft">Inspectors</p>
            <p className="text-xl font-bold leading-none text-ink">{loading ? '—' : inspectorCount}</p>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">Staff directory</h2>
            <p className="mt-0.5 text-xs text-ink-soft">Accounts with LGU administrative access.</p>
          </div>
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            placeholder="Search staff…"
            className="w-full sm:max-w-xs"
          />
        </div>

        <div className="mt-4">
          {loading ? (
            <LoadingState rows={4} label="Loading staff…" />
          ) : searched.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchTerm ? 'No matching staff' : 'No staff accounts yet besides you'}
              description={
                searchTerm
                  ? 'Try a different search term or clear the search box.'
                  : 'Create an Inspector or Admin account to get started.'
              }
              action={
                !searchTerm ? (
                  <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setShowForm(true)}>
                    New Staff Account
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={paginated}
                rowKey="user_id"
                renderMobile={(person) => (
                  <div
                    key={person.user_id}
                    className="rounded-2xl border border-line bg-white p-3.5 shadow-soft"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={person.full_name || person.username} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{person.username}</p>
                        <p className="truncate text-[11px] text-ink-muted">{person.full_name || '—'}</p>
                      </div>
                      <RoleBadge role={person.user_type} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft pt-2.5 text-[11px] text-ink-soft">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0 text-ink-muted" />
                        <span className="truncate">{person.email}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-ink-muted" />
                        {formatDate(person.created_at)}
                      </span>
                    </div>
                  </div>
                )}
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
        open={showForm}
        onClose={closeForm}
        title="New Staff Account"
        description="Create an Inspector or Admin account. Share the temporary password securely."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-staff-form" variant="gradient" loading={submitting}>
              {submitting ? 'Creating…' : 'Create Account'}
            </Button>
          </>
        }
      >
        <form id="create-staff-form" onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Username" htmlFor="staff-username" required>
              <Input
                id="staff-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>

            <Field label="Role" htmlFor="staff-role" required>
              <Select id="staff-role" value={userType} onChange={(e) => setUserType(e.target.value)}>
                <option value="inspector">Inspector</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
          </div>

          <Field label="Email" htmlFor="staff-email" required>
            <Input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field
            label="Temporary Password"
            htmlFor="staff-password"
            hint="Share this with them securely — they can change it after logging in."
            required
          >
            <Input
              id="staff-password"
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
