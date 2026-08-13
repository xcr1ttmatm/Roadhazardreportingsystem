import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

/**
 * Wrap any page that requires login.
 * Pass allowedRoles={['admin']} etc. to also restrict by role.
 * Usage: <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-primary">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.user_type)) {
    // Logged in, but wrong role — send them to their own dashboard instead
    return <Navigate to={`/${profile.user_type}`} replace />
  }

  return children
}