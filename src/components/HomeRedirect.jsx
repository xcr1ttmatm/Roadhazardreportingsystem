import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { homePathFor } from '../lib/homePath'

/** The "/" page: sends logged-out visitors to login and everyone else to their Hazard Map. */
export default function HomeRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homePathFor(profile?.user_type)} replace />
}