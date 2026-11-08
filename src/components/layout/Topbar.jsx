import { useLocation } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import NotificationBell from '../NotificationBell'
import BrandLogo from './BrandLogo'
import ProfileMenu from './ProfileMenu'

function currentItem(navGroups, pathname) {
  const items = navGroups.flatMap((group) => group.items)
  return items
    .filter((item) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0]
}

export default function Topbar({ navGroups, portal }) {
  const { pathname } = useLocation()
  const active = currentItem(navGroups, pathname)
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <header className="sticky top-0 z-30 px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/80 py-2 pl-2.5 pr-2 shadow-soft backdrop-blur-xl sm:pl-4 sm:pr-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-primary lg:hidden">
            <BrandLogo className="h-10 w-10" />
          </div>

          <div className="min-w-0">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted sm:block">{portal}</p>
            <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-ink sm:text-[15px]">
              {active?.label ?? 'Overview'}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="mr-1 hidden items-center gap-1.5 rounded-lg bg-canvas/80 px-2.5 py-1.5 text-[11px] font-medium text-ink-soft xl:flex">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {today}
          </span>

          <NotificationBell />

          <span className="mx-0.5 h-6 w-px bg-line" />

          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
