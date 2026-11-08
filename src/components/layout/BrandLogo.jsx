import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { branding } from '../../config/branding'
import { cn } from '../ui/utils'

/**
 * Renders the configured brand mark, falling back to the built-in shield
 * icon when no logo is set (or the image cannot be loaded).
 */
export default function BrandLogo({
  className,
  iconClassName = 'h-5 w-5',
  label = branding.name,
  strokeWidth = 2.2,
}) {
  const [failed, setFailed] = useState(false)

  if (branding.logo && !failed) {
    return (
      <img
        src={branding.logo}
        alt={label}
        onError={() => setFailed(true)}
        className={cn('object-contain', className)}
      />
    )
  }

  return <ShieldAlert className={cn(iconClassName, className)} strokeWidth={strokeWidth} />
}
