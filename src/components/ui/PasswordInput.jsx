import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from './Field'
import { cn } from './utils'

/** Password field with a show/hide toggle, used by every password form. */
export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder,
  className,
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={onChange}
        className={cn('pl-10 pr-11', className)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((value) => !value)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-primary"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
