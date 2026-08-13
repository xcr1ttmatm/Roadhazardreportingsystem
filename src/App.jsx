import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Register from './pages/Register'
import CitizenLayout from './pages/CitizenLayout'
import CitizenDashboard from './pages/CitizenDashboard'
import SubmitReport from './pages/SubmitReport'
import InspectorDashboard from './pages/InspectorDashboard'
import AdminDashboard from './pages/AdminDashboard'

function HomeRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${profile?.user_type ?? 'citizen'}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Citizen area — nested routes share CitizenLayout (header + nav) */}
          <Route
            path="/citizen"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <CitizenLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CitizenDashboard />} />
            <Route path="report/new" element={<SubmitReport />} />
          </Route>

          <Route
            path="/inspector/*"
            element={
              <ProtectedRoute allowedRoles={['inspector']}>
                <InspectorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}