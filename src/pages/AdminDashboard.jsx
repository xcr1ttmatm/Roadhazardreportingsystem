import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Clock, Search, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const STAT_CARDS = [
  { key: 'total', label: 'Total Reports', icon: ClipboardList, color: '#0F4C81' },
  { key: 'pending', label: 'Pending', icon: Clock, color: '#6B7280' },
  { key: 'under_review', label: 'Under Review', icon: Search, color: '#2563EB' },
  { key: 'approved', label: 'Approved', icon: CheckCircle2, color: '#16A34A' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: '#CE1126' },
]

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [counts, setCounts] = useState(null)

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

    fetchCounts()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0F4C81]">Welcome, {profile?.username}</h1>
      <p className="mt-1 text-sm text-gray-500">Overview of hazard reports across Iligan City.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${card.color}1A` }}
            >
              <card.icon className="h-4.5 w-4.5" style={{ color: card.color }} />
            </div>
            <p className="mt-3 text-2xl font-bold text-[#0F4C81]">
              {counts ? counts[card.key] : '—'}
            </p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      <Link
        to="/admin/reports"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0F4C81] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#0F4C81]/20 transition hover:bg-[#0B3A63]"
      >
        <ClipboardList className="h-4 w-4" />
        Monitor All Reports
      </Link>
    </div>
  )
}