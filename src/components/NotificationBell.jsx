import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Bell, CheckCheck, CheckCircle2, ChevronRight, Clock, Scan, Trash2, UserPlus, XCircle,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { cn } from './ui/utils'

/**
 * Where each role should land when opening a report from a notification.
 * Citizens have no report-detail route, so they deep-link into "My Reports",
 * which expands and scrolls to the matching card.
 */
function reportPathFor(userType, reportId) {
  if (!reportId) return null
  if (userType === 'admin') return `/admin/reports/${reportId}`
  if (userType === 'inspector') return `/inspector/reports/${reportId}`
  if (userType === 'citizen') return `/citizen/reports?report=${reportId}`
  return null
}

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

// Notification rows only store a title + message, so pick a friendly icon and
// tone from the title. All class names are static strings so Tailwind keeps them.
const NOTIFICATION_STYLES = {
  deleted: { Icon: Trash2, wrap: 'bg-danger-light text-danger' },
  rejected: { Icon: XCircle, wrap: 'bg-danger-light text-danger' },
  assigned: { Icon: UserPlus, wrap: 'bg-primary-light text-primary' },
  detection: { Icon: Scan, wrap: 'bg-secondary-light text-secondary' },
  verified: { Icon: CheckCircle2, wrap: 'bg-success-light text-success' },
  general: { Icon: Bell, wrap: 'bg-primary-light/70 text-primary' },
}

function notificationStyle(title = '') {
  const text = String(title).toLowerCase()
  if (text.includes('delet') || text.includes('remov')) return NOTIFICATION_STYLES.deleted
  if (text.includes('reject')) return NOTIFICATION_STYLES.rejected
  if (text.includes('assign') || text.includes('inspection') || text.includes('task')) {
    return NOTIFICATION_STYLES.assigned
  }
  if (text.includes('detect') || text.includes('scan') || text.includes('generat') || text.startsWith('ai')) {
    return NOTIFICATION_STYLES.detection
  }
  if (text.includes('verif') || text.includes('approv') || text.includes('resolv') || text.includes('complet')) {
    return NOTIFICATION_STYLES.verified
  }
  return NOTIFICATION_STYLES.general
}

export default function NotificationBell() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  // Counted on its own so unread items further down the list are still counted.
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const panelRef = useRef(null)
  const toastedIds = useRef(new Set()) // a notification only ever pops up once
  const userId = user?.id

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    await supabase.from('notifications').update({ is_read: true }).eq('notification_id', id)
  }, [])

  const openNotification = useCallback(
    (notification) => {
      if (!notification.is_read) markAsRead(notification.notification_id)
      const path = reportPathFor(profile?.user_type, notification.report_id)
      // A notification without a report ("Report deleted", etc.) is read-only,
      // so keep the panel open instead of dropping the user somewhere useless.
      if (!path) return
      setOpen(false)
      navigate(path)
    },
    [markAsRead, navigate, profile?.user_type]
  )

  // Facebook-style pop-up: appears wherever the user is, no panel needed.
  const showNotificationToast = useCallback(
    (notification) => {
      if (toastedIds.current.has(notification.notification_id)) return
      toastedIds.current.add(notification.notification_id)

      const { Icon, wrap } = notificationStyle(notification.title)
      const path = reportPathFor(profile?.user_type, notification.report_id)

      function handleOpen() {
        toast.dismiss(notification.notification_id)
        openNotification(notification)
      }

      toast.custom(
        (t) => (
          <div
            role={path ? 'button' : undefined}
            tabIndex={path ? 0 : undefined}
            onClick={() => {
              if (!path) {
                toast.dismiss(t.id)
                return
              }
              handleOpen()
            }}
            onKeyDown={(e) => {
              if (!path) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleOpen()
              }
            }}
            className={cn(
              'pointer-events-auto flex w-[min(88vw,360px)] items-start gap-3 rounded-2xl border border-line bg-white/95 p-3 text-left shadow-float backdrop-blur-xl',
              path ? 'cursor-pointer transition hover:border-primary/30 hover:bg-white' : 'cursor-default'
            )}
          >
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', wrap)}>
              <Icon className="h-[17px] w-[17px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold text-ink">{notification.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-relaxed text-ink-soft">
                {notification.message}
              </span>
              {path && <span className="mt-1 block text-[10px] font-semibold text-primary">Tap to open</span>}
            </span>
          </div>
        ),
        {
          id: notification.notification_id,
          duration: 6000,
          // The app-wide Toaster adds a white padded card. Our pop-up is its own
          // card, so strip the wrapper back to nothing to avoid a double frame.
          style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, borderRadius: 0, color: 'inherit' },
        }
      )
    },
    [openNotification, profile?.user_type]
  )

  useEffect(() => {
    if (!userId) return

    async function fetchNotifications() {
      const [list, unread] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('sent_at', { ascending: false })
          .limit(50),
        supabase
          .from('notifications')
          .select('notification_id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false),
      ])

      if (!list.error) setNotifications(list.data)
      if (typeof unread.count === 'number') setUnreadCount(unread.count)
    }

    fetchNotifications()

    // Live updates: a new notification pops up without needing to open the panel.
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        ({ new: row }) => {
          setNotifications((prev) =>
            prev.some((n) => n.notification_id === row.notification_id) ? prev : [row, ...prev]
          )
          if (!row.is_read) setUnreadCount((c) => c + 1)
          showNotificationToast(row)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        ({ new: row }) => {
          // Keeps a second tab / another device in sync.
          setNotifications((prev) =>
            prev.map((n) => (n.notification_id === row.notification_id ? { ...n, ...row } : n))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        ({ old: row }) => {
          setNotifications((prev) => prev.filter((n) => n.notification_id !== row.notification_id))
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId, showNotificationToast])

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

  async function markAllRead() {
    if (unreadCount === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
  }

  // Opening the panel never marks anything read: only pressing an item does.
  const visible = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-ink-soft transition hover:bg-canvas hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open && 'border-line bg-white text-primary shadow-sm'
        )}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2.1} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-gradient px-1 text-[9px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-2rem)] origin-top-right animate-scale-in overflow-hidden rounded-[20px] border border-line/80 bg-white/95 shadow-float backdrop-blur-xl max-sm:fixed max-sm:inset-x-3 max-sm:top-[4.25rem] max-sm:mt-0 max-sm:w-auto max-sm:max-w-none max-sm:origin-top"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line-soft bg-gradient-to-br from-primary-light/45 via-white to-secondary-light/35 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-line/70">
                <Bell className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-ink">Notifications</p>
                <p className="mt-0.5 text-[11px] font-medium text-ink-muted">
                  {unreadCount > 0
                    ? `${unreadCount} unread · ${notifications.length} total`
                    : 'You are all caught up'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-[10px] font-semibold text-primary shadow-sm ring-1 ring-line/70 transition hover:bg-white hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* All / Unread. The unread number is live, so it drops as items are read. */}
          <div className="flex items-center gap-1.5 border-b border-line-soft px-3 py-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                filter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-ink-soft hover:bg-canvas'
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              aria-pressed={filter === 'unread'}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                filter === 'unread' ? 'bg-primary text-white shadow-sm' : 'text-ink-soft hover:bg-canvas'
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="max-h-[22rem] overflow-y-auto p-1.5">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-secondary-light text-primary">
                  <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/70" />
                  {notifications.length === 0 ? (
                    <Bell className="relative h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="relative h-5 w-5" />
                  )}
                </span>
                <p className="mt-3 text-[13px] font-semibold text-ink">
                  {notifications.length === 0 ? "You're all caught up" : 'No unread notifications'}
                </p>
                <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-ink-muted">
                  {notifications.length === 0
                    ? 'Updates about your reports will appear here as they happen.'
                    : 'Everything has been read. Switch to All to see older updates.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {visible.map((n) => {
                  const { Icon, wrap } = notificationStyle(n.title)
                  const opensReport = Boolean(n.report_id)

                  return (
                    <button
                      type="button"
                      key={n.notification_id}
                      onClick={() => openNotification(n)}
                      title={opensReport ? 'Open report' : undefined}
                      className={cn(
                        'group flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        n.is_read ? 'hover:bg-canvas/70' : 'bg-primary-light/30 hover:bg-primary-light/50'
                      )}
                    >
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', wrap)}>
                        <Icon className="h-[17px] w-[17px]" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate text-[12.5px] leading-tight',
                              n.is_read ? 'font-semibold text-ink' : 'font-bold text-ink'
                            )}
                          >
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <>
                              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span className="sr-only">Unread</span>
                            </>
                          )}
                        </span>

                        <span className="mt-1 line-clamp-2 block text-[11.5px] leading-relaxed text-ink-soft">
                          {n.message}
                        </span>

                        <span className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-ink-muted">
                          <Clock className="h-3 w-3" />
                          {timeAgo(n.sent_at)}
                        </span>
                      </span>

                      {opensReport && (
                        <ChevronRight
                          aria-hidden="true"
                          className="mt-2 h-4 w-4 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
