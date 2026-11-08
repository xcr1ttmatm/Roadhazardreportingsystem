import { LayoutDashboard, FilePlus, ListChecks, Map } from 'lucide-react'
import AppShell from '../components/layout/AppShell'

const navGroups = [
  {
    title: 'Workspace',
    items: [
      { to: '/citizen', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/citizen/report/new', label: 'Submit Report', icon: FilePlus },
      { to: '/citizen/reports', label: 'My Reports', icon: ListChecks },
    ],
  },
  {
    title: 'Explore',
    items: [{ to: '/citizen/map', label: 'Hazard Map', icon: Map }],
  },
]

export default function CitizenLayout() {
  return <AppShell navGroups={navGroups} portal="Citizen Portal" portalTag="Road Hazard Reporting" />
}
