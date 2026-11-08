import { Loader2 } from 'lucide-react'
import { cn } from './utils'
import { buttonClasses, ICON_SIZES } from './buttonStyles'

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  className,
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={props.disabled || loading}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(ICON_SIZES[size] ?? ICON_SIZES.md, 'animate-spin')} />
      ) : Icon ? (
        <Icon className={ICON_SIZES[size] ?? ICON_SIZES.md} />
      ) : null}
      {children}
      {!loading && IconRight ? <IconRight className={ICON_SIZES[size] ?? ICON_SIZES.md} /> : null}
    </button>
  )
}
