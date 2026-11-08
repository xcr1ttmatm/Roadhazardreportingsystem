import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { branding } from '../../config/branding'
import { cn } from '../ui/utils'

/**
 * Auth-page brand lockup. Renders a configured logo when available and
 * otherwise falls back to the built-in shield icon + wordmark.
 *
 * `tone="dark"` is used on the gradient panel (white text/tile),
 * `tone="light"` is used on the white mobile header.
 */
export default function AuthBrand({ logo, tone = 'dark', size = 'md' }) {
  const [failed, setFailed] = useState(false)
  const onDark = tone === 'dark'
  const large = size === 'lg'

  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt={branding.name}
        onError={() => setFailed(true)}
        className={cn('w-auto object-contain', large ? 'h-16 max-w-[320px]' : 'h-12 max-w-[260px]')}
      />
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl',
          large ? 'h-11 w-11' : 'h-9 w-9',
          onDark ? 'bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur' : 'bg-brand-gradient text-white shadow-glow-blue'
        )}
      >
        <ShieldAlert
          className={cn('text-white', large ? 'h-6 w-6' : 'h-[18px] w-[18px]')}
          strokeWidth={2.3}
        />
      </div>
      <div className="min-w-0">
        <p className={cn('truncate font-bold tracking-tight', onDark ? 'text-sm text-white' : 'text-xs text-ink')}>
          {branding.name}
        </p>
        <p
          className={cn(
            'truncate font-semibold uppercase tracking-[0.18em]',
            onDark ? 'text-[10px] text-white/60' : 'text-[9px] tracking-[0.16em] text-primary'
          )}
        >
          {branding.tagline}
        </p>
      </div>
    </div>
  )
}
