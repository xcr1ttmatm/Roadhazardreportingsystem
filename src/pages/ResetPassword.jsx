import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight, KeyRound, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { MIN_PASSWORD_LENGTH, friendlyPasswordError } from '../lib/password'
import AuthShell from '../components/layout/AuthShell'
import { Field } from '../components/ui/Field'
import PasswordInput from '../components/ui/PasswordInput'
import Button from '../components/ui/Button'

const FEATURES = [
  { icon: KeyRound, text: 'Set a new password for your account' },
  { icon: ShieldCheck, text: 'Links are single-use and expire automatically' },
  { icon: TriangleAlert, text: 'Report road hazards once you are back in' },
]

/** Supabase appends error details to the URL when a recovery link is expired or invalid. */
function readLinkError() {
  const hash = window.location.hash?.replace(/^#/, '') || ''
  const search = window.location.search?.replace(/^\?/, '') || ''
  for (const raw of [hash, search]) {
    if (!raw) continue
    const params = new URLSearchParams(raw)
    if (params.get('error') || params.get('error_code')) {
      const description = params.get('error_description') || ''
      if (/expired/i.test(description) || /expired/i.test(params.get('error_code') || '')) {
        return 'This reset link has expired. Request a new one below.'
      }
      return 'This reset link is invalid or was already used. Request a new one below.'
    }
  }
  return ''
}

/** Captured at module load, before Supabase consumes the recovery hash. */
const INITIAL_LINK_ERROR = readLinkError()

export default function ResetPassword() {
  const { user, loading, updatePassword, signOut } = useAuth()
  const navigate = useNavigate()

  const [linkError] = useState(INITIAL_LINK_ERROR)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const hasSession = Boolean(user)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The new passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await updatePassword(password)
      if (updateError) {
        setError(friendlyPasswordError(updateError.message))
        return
      }

      setDone(true)
      toast.success('Password updated. Sign in with your new password.')

      // End the recovery session so the user verifies the new password at login.
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(friendlyPasswordError(err?.message))
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <>
      Remembered it?{' '}
      <Link to="/login" className="font-semibold text-primary hover:underline">
        Back to sign in
      </Link>
    </>
  )

  if (loading) {
    return (
      <AuthShell
        headline="Almost there."
        description="We are checking your reset link."
        features={FEATURES}
        title="Checking your link"
        subtitle="This only takes a moment."
        footer={footer}
      >
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-ink-soft">Verifying your reset link…</p>
        </div>
      </AuthShell>
    )
  }

  if (linkError || !hasSession) {
    return (
      <AuthShell
        headline="Links expire."
        description="Password reset links are single-use and time-limited."
        features={FEATURES}
        title="Link no longer valid"
        subtitle="Request a fresh reset email to continue."
        footer={footer}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-light/50 px-4 py-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-xs leading-relaxed text-danger">
              {linkError ||
                'This reset link is invalid or has expired. Open the sign-in page and choose “Forgot password?” to request a new one.'}
            </p>
          </div>

          <Button
            variant="gradient"
            size="lg"
            iconRight={ArrowRight}
            className="w-full"
            onClick={() => navigate('/login', { replace: true })}
          >
            Request a new link
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      headline="New password. Same account."
      description="Choose a password you have not used before, then sign in with it."
      features={FEATURES}
      title="Choose a new password"
      subtitle={user?.email ? `Resetting the password for ${user.email}` : 'Enter and confirm your new password.'}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="New password" htmlFor="reset-new-password" required hint="At least 8 characters.">
          <PasswordInput
            id="reset-new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>

        <Field label="Confirm new password" htmlFor="reset-confirm-password" required>
          <PasswordInput
            id="reset-confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-light/60 px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          loading={submitting}
          disabled={done}
          iconRight={submitting ? undefined : ArrowRight}
          className="w-full"
        >
          {submitting ? 'Saving…' : 'Set new password'}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-ink-muted">
          For your security, all other devices will be signed out after the change.
        </p>
      </form>
    </AuthShell>
  )
}
