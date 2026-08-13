import { Link } from 'react-router-dom'
import { FilePlus, ListChecks, Map } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function CitizenDashboard() {
  const { profile } = useAuth()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0F4C81]">Welcome, {profile?.username}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Report a road hazard or check the status of your existing reports.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/citizen/report/new"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F4C81]/10">
            <FilePlus className="h-5 w-5 text-[#0F4C81]" />
          </div>
          <h2 className="mt-4 font-semibold text-[#0F4C81]">Submit a Report</h2>
          <p className="mt-1 text-sm text-gray-500">
            Spotted a pothole or road damage? Report it with a photo and location pin.
          </p>
        </Link>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-6 opacity-60">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
            <ListChecks className="h-5 w-5 text-gray-400" />
          </div>
          <h2 className="mt-4 font-semibold text-gray-400">Track My Reports</h2>
          <p className="mt-1 text-sm text-gray-400">Coming in the next module.</p>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-6 opacity-60">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
            <Map className="h-5 w-5 text-gray-400" />
          </div>
          <h2 className="mt-4 font-semibold text-gray-400">Hazard Map</h2>
          <p className="mt-1 text-sm text-gray-400">Coming in the next module.</p>
        </div>
      </div>
    </div>
  )
}