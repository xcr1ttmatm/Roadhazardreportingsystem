import { cn } from './utils'

const VARIANTS = {
  primary:
    'bg-primary text-white shadow-glow-blue hover:bg-primary-dark active:scale-[0.985] focus-visible:outline-primary',
  gradient:
    'bg-brand-gradient text-white shadow-glow-blue hover:brightness-[1.05] active:scale-[0.985]',
  secondary:
    'border border-line bg-white text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-primary/30 hover:bg-primary-light/40 hover:text-primary',
  soft: 'bg-primary-light/70 text-primary hover:bg-primary-light',
  danger: 'bg-danger text-white shadow-[0_10px_24px_-14px_rgba(220,38,38,0.75)] hover:bg-red-700 active:scale-[0.985]',
  success:
    'bg-success text-white shadow-[0_10px_24px_-14px_rgba(5,150,105,0.75)] hover:bg-emerald-700 active:scale-[0.985]',
  'secondary-danger': 'border border-line bg-white text-danger hover:border-danger/30 hover:bg-danger-light/60',
  ghost: 'text-ink-soft hover:bg-canvas hover:text-ink',
  link: 'text-primary underline-offset-4 hover:underline',
}

const SIZES = {
  xs: 'gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold',
  sm: 'gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold',
  md: 'gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold',
  lg: 'gap-2 rounded-xl px-5 py-3 text-sm font-semibold',
  icon: 'h-9 w-9 items-center justify-center rounded-xl',
}

export const ICON_SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
  icon: 'h-[18px] w-[18px]',
}

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    className
  )
}
