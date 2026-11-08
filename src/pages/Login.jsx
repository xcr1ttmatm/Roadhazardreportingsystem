import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock, ArrowRight, MapPin, TriangleAlert, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { homePathFor } from '../lib/homePath'
import AuthShell from '../components/layout/AuthShell'
import { Field, Input } from '../components/ui/Field'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

const FEATURES = [
  { icon: MapPin, text: 'Pin the exact hazard location on the map' },
  { icon: TriangleAlert, text: 'AI-assisted severity detection' },
  { icon: ShieldCheck, text: 'Verified by your local government' },
]

export default function Login() {
  const { signIn, sendPasswordReset, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)

    const { data, error } = await signIn({ email, password })

    if (error) {
      toast.error(error.message)
      setSubmitting(false)
      return
    }

    toast.success('Login successful')

    const { supabase } = await import('../lib/supabase')
    const { data: profile } = await supabase
      .from('users')
      .select('user_type')
      .eq('user_id', data.user.id)
      .single()

    navigate(homePathFor(profile?.user_type))
    setSubmitting(false)
  }

  function openResetDialog() {
    setResetEmail(email)
    setResetOpen(true)
  }

  async function handleResetRequest(e) {
    e.preventDefault()
    setResetSubmitting(true)
    const { error } = await sendPasswordReset(resetEmail.trim())
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Reset link sent. Check your email (and spam folder).')
      setResetOpen(false)
    }
    setResetSubmitting(false)
  }

  // Already logged in? Skip this page and go straight to the Hazard Map.
  if (!loading && user && profile) return <Navigate to={homePathFor(profile.user_type)} replace />

  return (
    <>
      <AuthShell
        headline={
          <>
            See a hazard.
            <br />
            Report it. Make it <span className="text-white/80">safer.</span>
          </>
        }
        description="Help your community by reporting potholes, cracks, and road damage — verified by your local government and visible to everyone."
        features={FEATURES}
        title="Welcome back"
        subtitle="Sign in to your account to continue"
        footer={
          <>
            New citizen user?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Email" htmlFor="login-email" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="login-password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-11"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-primary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={openResetDialog}
              className="text-xs font-semibold text-primary transition hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            loading={submitting}
            iconRight={submitting ? undefined : ArrowRight}
            className="w-full"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-ink-muted">
            Use the account provided by your LGU administrator or create a citizen account.
          </p>
        </form>
      </AuthShell>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        size="sm"
        title="Reset your password"
        description="We'll email you a secure link to choose a new password."
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)} disabled={resetSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="reset-password-form" variant="gradient" loading={resetSubmitting}>
              {resetSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        }
      >
        <form id="reset-password-form" onSubmit={handleResetRequest} className="space-y-4">
          <Field label="Email" htmlFor="reset-email" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                id="reset-email"
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="pl-10"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </Field>
        </form>
      </Modal>
    </>
  )
}
