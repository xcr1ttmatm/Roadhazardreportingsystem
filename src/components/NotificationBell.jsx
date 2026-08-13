import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

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
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#CE1126] text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-[#0F4C81]">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-[#0F4C81] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.notification_id}
                  onClick={() => markAsRead(n.notification_id)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-gray-50 px-4 py-3 text-left transition hover:bg-gray-50 ${
                    !n.is_read ? 'bg-[#0F4C81]/5' : ''
                  }`}
                >
                  <div className="flex w-full items-center gap-2">
                    {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CE1126]" />}
                    <span className="text-sm font-medium text-[#0F4C81]">{n.title}</span>
                  </div>
                  <p className="text-xs text-gray-500">{n.message}</p>
                  <span className="mt-0.5 text-[11px] text-gray-400">{timeAgo(n.sent_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}