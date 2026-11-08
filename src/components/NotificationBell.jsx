import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { cn } from './ui/utils'

function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    if (!user) return

    async function fetchNotifications() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(20)

      if (!error) setNotifications(data)
    }

    fetchNotifications()

    // Live updates: new notification arrives without needing a refresh
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => [payload.new, ...prev])
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // Close dropdown when clicking outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
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

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)))
    await supabase.from('notifications').update({ is_read: true }).eq('notification_id', id)
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.notification_id)
    if (unreadIds.length === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).in('notification_id', unreadIds)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-ink-soft transition hover:bg-canvas hover:text-primary',
          open && 'border-line bg-canvas/70 text-primary'
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-line bg-white shadow-float max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.5rem] max-sm:mt-0 max-sm:w-auto max-sm:max-w-none max-sm:origin-top">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <div>
              <p className="text-sm font-bold tracking-tight text-ink">Notifications</p>
              <p className="text-[10px] font-medium text-ink-muted">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 rounded-lg bg-primary-light/60 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary-light"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas text-ink-muted">
                  <Bell className="h-5 w-5" />
                </span>
                <p className="mt-3 text-xs font-semibold text-ink">No notifications yet</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Updates about your reports will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  type="button"
                  key={n.notification_id}
                  onClick={() => markAsRead(n.notification_id)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 border-b border-line-soft px-4 py-3 text-left transition last:border-0 hover:bg-canvas/70',
                    !n.is_read && 'bg-primary-light/25'
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="truncate text-xs font-semibold text-ink">{n.title}</span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-soft">{n.message}</p>
                  <span className="mt-0.5 text-[10px] text-ink-muted">{timeAgo(n.sent_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
