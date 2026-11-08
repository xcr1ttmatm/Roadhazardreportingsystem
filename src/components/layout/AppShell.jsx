import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { cn } from '../ui/utils'

const COLLAPSE_KEY = 'nexora.sidebar.collapsed'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Shared authenticated shell: floating sidebar (laptop/desktop), bottom
 * navigation (mobile/tablet) + floating topbar + content.
 * Purely presentational — routes, guards and pages keep their behaviour.
 */
export default function AppShell({ navGroups, portal, portalTag }) {
  const { profile, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(readCollapsed)

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* localStorage can be unavailable in private mode — ignore */
    }
  }, [collapsed])

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        navGroups={navGroups}
        portal={portal}
        portalTag={portalTag}
        profile={profile}
        signOut={signOut}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-300 ease-out',
          collapsed ? 'lg:pl-[116px]' : 'lg:pl-[300px]'
        )}
      >
        <Topbar navGroups={navGroups} portal={portal} />

        <main className="flex-1 px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px] animate-fade-up">
            <Outlet />
          </div>
        </main>

        <footer className="px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-6">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[11px] text-ink-muted">
            <p>© {new Date().getFullYear()} Road Hazard Reporting System · Local Government Unit</p>
            <p className="font-medium">Secured with Supabase</p>
          </div>
        </footer>
      </div>

      <BottomNav navGroups={navGroups} />
    </div>
  )
}
