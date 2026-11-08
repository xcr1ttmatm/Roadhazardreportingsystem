import { Link, useLocation } from 'react-router-dom'
import { cn } from '../ui/utils'

function isItemActive(item, pathname) {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/**
 * Mobile / tablet primary navigation.
 * Visible below `lg`, while the floating sidebar takes over from `lg` up.
 * Purely presentational — routes and permissions are unchanged.
 */
export default function BottomNav({ navGroups = [] }) {
  const { pathname } = useLocation()
  const items = navGroups.flatMap((group) => group.items)

  if (!items.length) return null

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch gap-0.5 rounded-2xl border border-line/80 bg-white/95 p-1.5 shadow-float backdrop-blur-xl">
        {items.map((item) => {
          const active = isItemActive(item, pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors duration-200 hover:bg-canvas/70"
            >
              <span
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                  active
                    ? 'bg-brand-gradient text-white shadow-[0_10px_20px_-12px_rgba(79,70,229,0.9)]'
                    : 'text-ink-muted group-hover:text-primary'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.badge ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {item.badge}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'w-full truncate text-center text-[10px] font-semibold leading-tight',
                  active ? 'text-primary' : 'text-ink-muted'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
