import { useEffect, useRef, useState } from 'react'
import { ChevronDown, KeyRound, LogOut, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import Avatar from '../ui/Avatar'
import { RoleBadge } from '../ui/Badge'
import { cn } from '../ui/utils'
import ChangePasswordModal from '../account/ChangePasswordModal'

export default function ProfileMenu() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const displayName = profile?.full_name || profile?.username || 'My Account'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-transparent py-1 pl-1 pr-1.5 transition hover:bg-canvas sm:pr-2.5',
          open && 'border-line bg-canvas/70'
        )}
      >
        <Avatar name={displayName} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-[130px] truncate text-xs font-semibold leading-tight text-ink">
            {profile?.username}
          </span>
          <span className="block text-[10px] font-medium capitalize leading-tight text-ink-muted">
            {profile?.user_type}
          </span>
        </span>
        <ChevronDown
          className={cn('hidden h-3.5 w-3.5 text-ink-muted transition-transform sm:block', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-line bg-white shadow-float"
        >
          <div className="border-b border-line-soft bg-gradient-to-br from-primary-light/50 via-white to-secondary-light/40 px-4 py-4">
            <div className="flex items-center gap-3">
              <Avatar name={displayName} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{displayName}</p>
                <p className="truncate text-[11px] text-ink-soft">@{profile?.username}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <RoleBadge role={profile?.user_type} />
              {profile?.email && (
                <span className="flex min-w-0 items-center gap-1 truncate text-[10px] text-ink-muted">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </span>
              )}
            </div>
          </div>

          <div className="px-2 py-2">
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-ink-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Securely signed in with Supabase
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setShowChangePassword(true)
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-ink-soft transition hover:bg-canvas hover:text-ink"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Change password
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-danger transition hover:bg-danger-light/70"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        </div>
      )}

      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  )
}
