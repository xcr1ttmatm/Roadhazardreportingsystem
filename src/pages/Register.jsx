import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock, User, ArrowRight, MapPin, Camera, IdCard, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { homePathFor } from '../lib/homePath'
import AuthShell from '../components/layout/AuthShell'
import { Field, Input } from '../components/ui/Field'
import Button from '../components/ui/Button'

const FEATURES = [
  { icon: Camera, text: 'Attach photos as evidence' },
  { icon: MapPin, text: 'Pin the exact hazard location' },
  { icon: ShieldCheck, text: 'Track your report until it is resolved' },
]

export default function Register() {
  const { signUp, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await signUp({ email, password, username, fullName, address })

    if (error) {
      toast.error(error.message)
      setSubmitting(false)
      return
    }

    toast.success('Account created! Check your email to confirm, then log in.')
    navigate('/login')
    setSubmitting(false)
  }

  // Already logged in? Skip this page and go straight to the Hazard Map.
  if (!loading && user && profile) return <Navigate to={homePathFor(profile.user_type)} replace />

  return (
    <AuthShell
      headline={
        <>
          Join the effort to keep
          <br />
          <span className="text-white/80">safer roads</span> for everyone.
        </>
      }
      description="Create a free citizen account to submit hazard reports, upload photos, and track their status until they're resolved."
      features={FEATURES}
      title="Create your account"
      subtitle="Takes less than a minute"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username" htmlFor="register-username" required>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                id="register-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Juan"
                className="pl-10"
                autoComplete="username"
              />
            </div>
          </Field>

          <Field label="Full Name" htmlFor="register-fullname" required>
            <div className="relative">
              <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                id="register-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dela Cruz"
                className="pl-10"
                autoComplete="name"
              />
            </div>
          </Field>
        </div>

        <Field label="Address" htmlFor="register-address" required>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              id="register-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Barangay, Iligan City"
              className="pl-10"
              autoComplete="street-address"
            />
          </div>
        </Field>

        <Field label="Email" htmlFor="register-email" required>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              autoComplete="email"
            />
          </div>
        </Field>

        <Field label="Password" htmlFor="register-password" hint="At least 6 characters." required>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-11"
              autoComplete="new-password"
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

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          loading={submitting}
          iconRight={submitting ? undefined : ArrowRight}
          className="w-full"
        >
          {submitting ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
    </AuthShell>
  )
}
