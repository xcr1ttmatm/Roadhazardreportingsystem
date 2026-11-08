import { Link, useLocation } from 'react-router-dom'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Avatar from '../ui/Avatar'
import BrandLogo from './BrandLogo'
import { cn } from '../ui/utils'

function isItemActive(item, pathname) {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/**
 * Floating desktop sidebar (laptop / desktop only).
 * Mobile and tablet users get the bottom navigation instead.
 */
export default function Sidebar({
  navGroups = [],
  portal = 'LGU Portal',
  portalTag = 'Road Hazard Reporting',
  profile,
  signOut,
  collapsed,
  onToggleCollapse,
}) {
  const { pathname } = useLocation()

  return (
    <aside
      className={cn(
        'fixed inset-y-4 left-4 z-40 hidden w-[268px] flex-col rounded-[24px] border border-line bg-white shadow-float transition-all duration-300 ease-out lg:flex',
        collapsed ? 'lg:w-[84px]' : 'lg:w-[268px]'
      )}
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-3 px-4 pb-3 pt-5', collapsed && 'lg:justify-center lg:px-2')}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center text-primary">
          <BrandLogo className="h-12 w-12" />
        </div>

        <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
          <p className="truncate text-sm font-bold leading-tight tracking-tight text-ink">Road Hazard</p>
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{portalTag}</p>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-primary lg:flex',
            collapsed && 'lg:hidden'
          )}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="mx-auto mb-2 hidden h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-primary lg:flex"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <div className="mx-4 mb-2 h-px bg-line-soft" />

      {/* Navigation */}
      <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p
              className={cn(
                'mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted',
                collapsed && 'lg:hidden'
              )}
            >
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isItemActive(item, pathname)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200',
                      collapsed && 'lg:justify-center lg:px-0',
                      active
                        ? 'bg-brand-gradient text-white shadow-[0_12px_24px_-14px_rgba(79,70,229,0.9)]'
                        : 'text-ink-soft hover:bg-canvas hover:text-ink'
                    )}
                  >
                    <item.icon
                      className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-ink-muted group-hover:text-primary')}
                    />
                    <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                    {item.badge && !collapsed && (
                      <span className="ml-auto rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Portal + user */}
      <div className="border-t border-line-soft p-3">
        {!collapsed && (
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{portal}</p>
        )}
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-canvas to-primary-light/30 p-2.5',
            collapsed && 'lg:justify-center lg:bg-transparent lg:p-0'
          )}
        >
          <Avatar name={profile?.full_name || profile?.username} size="sm" />
          <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
            <p className="truncate text-xs font-semibold text-ink">{profile?.username ?? 'Signed in'}</p>
            <p className="truncate text-[10px] font-medium capitalize text-ink-muted">{profile?.user_type ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Log out"
            aria-label="Log out"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-danger-light hover:text-danger',
              collapsed && 'lg:hidden'
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={signOut}
            title="Log out"
            aria-label="Log out"
            className="mx-auto mt-2 hidden h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition hover:bg-danger-light hover:text-danger lg:flex"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
