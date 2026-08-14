import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { UserPlus, ShieldCheck, HardHat, Mail, Calendar, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ROLE_STYLES = {
  admin: 'bg-[#0F4C81]/10 text-[#0F4C81]',
  inspector: 'bg-[#FCD116]/20 text-[#8a6d00]',
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ManageUsers() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F4C81]">Manage Staff</h1>
          <p className="mt-1 text-sm text-gray-500">Create and view Inspector and Admin accounts.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0F4C81]/20 transition hover:bg-[#0B3A63]"
        >
          {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Staff Account'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#0F4C81] focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Role</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#0F4C81] focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
              >
                <option value="inspector">Inspector</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#0F4C81] focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Temporary Password</label>
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Share this with them securely — they can change it after logging in"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#0F4C81] focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[#0F4C81] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0B3A63] disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-400">Loading staff...</p>
        ) : staff.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <p className="text-sm text-gray-500">No staff accounts yet besides you.</p>
          </div>
        ) : (
          staff.map((person) => (
            <div
              key={person.user_id}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                {person.user_type === 'admin' ? (
                  <ShieldCheck className="h-5 w-5 text-[#0F4C81]" />
                ) : (
                  <HardHat className="h-5 w-5 text-[#8a6d00]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#0F4C81]">{person.username}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {person.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(person.created_at)}
                  </span>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ROLE_STYLES[person.user_type]}`}>
                {person.user_type}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}