import { Outlet, Link, useLocation } from 'react-router-dom'
import { ShieldAlert, LayoutDashboard, ClipboardList, Users, Map, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/reports', label: 'Reports', icon: ClipboardList },
  { to: '/admin/inspectors', label: 'Staff', icon: Users },
  // { to: '/admin/map', label: 'Hazard Map', icon: Map },           // reuse citizen map later
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  function isActive(item) {
    return item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F4C81]">
              <ShieldAlert className="h-4 w-4 text-[#FCD116]" />
            </div>
            <span className="truncate text-xs font-semibold tracking-wide text-[#0F4C81] sm:text-sm">
              LGU Admin Console
            </span>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(item) ? 'bg-[#0F4C81]/10 text-[#0F4C81]' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">Hi, {profile?.username}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg bg-[#CE1126] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#A50E1F]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 sm:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isActive(item) ? 'bg-[#0F4C81]/10 text-[#0F4C81]' : 'text-gray-500'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}