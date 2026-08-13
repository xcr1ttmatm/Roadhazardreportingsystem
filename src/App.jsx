import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Register from './pages/Register'
import CitizenLayout from './pages/CitizenLayout'
import CitizenDashboard from './pages/CitizenDashboard'
import SubmitReport from './pages/SubmitReport'
import TrackReports from './pages/TrackReports'
import HazardMap from './pages/HazardMap'
import AdminLayout from './pages/AdminLayout'
import AdminDashboard from './pages/AdminDashboard'
import MonitorReports from './pages/MonitorReports'
import ReportDetail from './pages/ReportDetail'
import InspectorDashboard from './pages/InspectorDashboard'

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
            <Route path="reports" element={<TrackReports />} />
            <Route path="map" element={<HazardMap />} />
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
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<MonitorReports />} />
            <Route path="reports/:reportId" element={<ReportDetail />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}