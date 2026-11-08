import { LayoutDashboard, ClipboardList, Users, Map } from 'lucide-react'
import AppShell from '../components/layout/AppShell'

const navGroups = [
  {
    title: 'Workspace',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/reports', label: 'Reports', icon: ClipboardList },
      { to: '/admin/map', label: 'Hazard Map', icon: Map },
    ],
  },
  {
    title: 'Administration',
    items: [{ to: '/admin/inspectors', label: 'Staff', icon: Users }],
  },
]

export default function AdminLayout() {
  return <AppShell navGroups={navGroups} portal="Admin Console" portalTag="LGU Administration" />
}
