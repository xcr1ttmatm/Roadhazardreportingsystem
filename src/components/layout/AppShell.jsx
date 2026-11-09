import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
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
  const { pathname } = useLocation()
  const scrollRef = useRef(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* localStorage can be unavailable in private mode — ignore */
    }
  }, [collapsed])

  // The shell owns the only vertical scroll container, so a route change must
  // move that container back to the top (the document itself never scrolls).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <div className="h-[100dvh] overflow-hidden bg-canvas">
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
          'flex h-full min-h-0 flex-col transition-[padding] duration-300 ease-out',
          collapsed ? 'lg:pl-[116px]' : 'lg:pl-[300px]'
        )}
      >
        <Topbar navGroups={navGroups} portal={portal} />

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <main className="px-4 pb-10 pt-5 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1440px] animate-fade-up">
              <Outlet />
            </div>
          </main>

          <footer className="px-4 pb-[calc(6.5rem_+_env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-6">
            <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[11px] text-ink-muted">
              <p>© {new Date().getFullYear()} Road Hazard Reporting System · Local Government Unit</p>
              <p className="font-medium">Secured with Supabase</p>
            </div>
          </footer>
        </div>
      </div>

      <BottomNav navGroups={navGroups} />
    </div>
  )
}
