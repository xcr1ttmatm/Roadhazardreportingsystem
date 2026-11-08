import { Navigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { homePathFor } from '../lib/homePath'

/** The "/" page: sends logged-out visitors to login and everyone else to their Hazard Map. */
export default function HomeRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow-blue">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/30" />
          <ShieldAlert className="relative h-7 w-7" strokeWidth={2.2} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink">Road Hazard Reporting</p>
          <p className="mt-0.5 text-xs text-ink-muted">Preparing your portal…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homePathFor(profile?.user_type)} replace />
}
