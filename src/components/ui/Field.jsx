import { cn } from './utils'

export const inputBase =
  'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-soft'

export function Field({ label, htmlFor, hint, error, required, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ className, ...props }) {
  return <input className={cn(inputBase, className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(inputBase, 'select-chevron cursor-pointer appearance-none pr-10', className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(inputBase, 'resize-none leading-relaxed', className)} {...props} />
}
