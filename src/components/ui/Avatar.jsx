import { cn, initialsOf } from './utils'

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg',
}

export default function Avatar({ name, size = 'md', className, rounded = 'rounded-xl' }) {
  return (
    <span
      title={name || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-primary via-accent to-secondary font-bold tracking-wide text-white shadow-sm ring-2 ring-white',
        rounded,
        SIZES[size] ?? SIZES.md,
        className
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
