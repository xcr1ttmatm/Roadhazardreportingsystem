import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomeRedirect from './components/HomeRedirect'

import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import CitizenLayout from './pages/CitizenLayout'
import CitizenDashboard from './pages/CitizenDashboard'
import SubmitReport from './pages/SubmitReport'
import TrackReports from './pages/TrackReports'
import HazardMap from './pages/HazardMap'
import AdminLayout from './pages/AdminLayout'
import AdminDashboard from './pages/AdminDashboard'
import MonitorReports from './pages/MonitorReports'
import ReportDetail from './pages/ReportDetail'
import ManageUsers from './pages/ManageUsers'
import InspectorLayout from './pages/InspectorLayout'
import InspectorDashboard from './pages/InspectorDashboard'
import InspectionDetail from './pages/InspectionDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          gutter={12}
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 500,
              padding: '12px 16px',
              boxShadow: '0 18px 45px -24px rgba(30, 41, 59, 0.28)',
            },
            success: { iconTheme: { primary: '#059669', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' } },
            loading: { iconTheme: { primary: '#2563EB', secondary: '#FFFFFF' } },
          }}
        />
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />

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
            path="/inspector"
            element={
              <ProtectedRoute allowedRoles={['inspector']}>
                <InspectorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InspectorDashboard />} />
            <Route path="reports/:reportId" element={<InspectionDetail />} />
            <Route path="map" element={<HazardMap />} />
          </Route>

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
            <Route path="inspectors" element={<ManageUsers />} />
            <Route path="map" element={<HazardMap />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}