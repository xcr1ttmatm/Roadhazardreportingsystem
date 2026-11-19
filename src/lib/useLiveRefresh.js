import { useEffect, useId, useRef } from 'react'
import { supabase } from './supabase'

/**
 * Keeps a page's data fresh without owning any fetch logic.
 *
 * Runs `refetch` once on mount, again on relevant Supabase row changes, and
 * whenever the tab is focused again. The callback is held in a ref so callers
 * can define their fetch function inline without re-subscribing on every
 * render.
 *
 * Realtime is best-effort: if the table is not in the project's publication,
 * focus/visibility refresh still keeps the page current.
 */
export function useLiveRefresh(refetch, { tables = ['hazard_reports'], filter } = {}) {
  const channelId = useId().replace(/:/g, '')
  const callbackRef = useRef(refetch)
  const tablesKey = tables.join(',')
  const filterKey = filter || ''

  // Track the latest callback without tearing down the subscription.
  useEffect(() => {
    callbackRef.current = refetch
  })

  useEffect(() => {
    let timer
    const refresh = (delay = 120) => {
      // Coalesce bursts (e.g. an insert followed by a status update).
      clearTimeout(timer)
      timer = setTimeout(() => callbackRef.current?.(), delay)
    }

    const channel = supabase.channel(`live-refresh-${channelId}`)
    for (const table of tablesKey.split(',').filter(Boolean)) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filterKey ? { filter: filterKey } : {}),
        },
        refresh
      )
    }
    channel.subscribe()

    const onFocus = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    // Initial load is driven from here so pages don't need a second effect.
    refresh(0)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      supabase.removeChannel(channel)
    }
  }, [channelId, tablesKey, filterKey])
}
