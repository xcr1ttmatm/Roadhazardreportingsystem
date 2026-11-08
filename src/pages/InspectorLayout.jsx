import { ClipboardCheck, Map } from 'lucide-react'
import AppShell from '../components/layout/AppShell'

const navGroups = [
  {
    title: 'Field Work',
    items: [
      { to: '/inspector', label: 'Assignments', icon: ClipboardCheck, end: true },
      { to: '/inspector/map', label: 'Hazard Map', icon: Map },
    ],
  },
]

export default function InspectorLayout() {
  return <AppShell navGroups={navGroups} portal="Inspector Portal" portalTag="LGU Field Operations" />
}
