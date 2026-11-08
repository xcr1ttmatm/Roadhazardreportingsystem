import { useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { MIN_PASSWORD_LENGTH, friendlyPasswordError } from '../../lib/password'
import Modal from '../ui/Modal'
import PasswordInput from '../ui/PasswordInput'
import { Field } from '../ui/Field'
import Button from '../ui/Button'

/**
 * Change-password dialog, available from the profile menu for every role.
 *
 * Re-authenticates with the current password before calling updateUser, so a
 * borrowed/left-open session cannot silently take over the account.
 */
export default function ChangePasswordModal({ open, onClose }) {
  const { profile, user, updatePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Clear everything whenever the dialog closes so a reopen starts clean.
  function resetFields() {
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
  }

  function close() {
    if (submitting) return
    resetFields()
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (next !== confirm) {
      setError('The new passwords do not match.')
      return
    }
    if (next === current) {
      setError('Choose a password that is different from your current one.')
      return
    }

    const email = profile?.email || user?.email
    if (!email) {
      setError('Could not read your account email. Please sign out and back in.')
      return
    }

    setSubmitting(true)
    try {
      // 1. Prove the person knows the current password.
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: current })
      if (reauthError) {
        setError(friendlyPasswordError(reauthError.message))
        return
      }

      // 2. Set the new password.
      const { error: updateError } = await updatePassword(next)
      if (updateError) {
        setError(friendlyPasswordError(updateError.message))
        return
      }

      // 3. Security: sign out every other device, keep this one.
      await supabase.auth.signOut({ scope: 'others' }).catch(() => {})

      toast.success('Password updated')
      resetFields()
      onClose()
    } catch (err) {
      setError(friendlyPasswordError(err?.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title="Change password"
      description="Use at least 8 characters. You'll stay signed in on this device only."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="change-password-form"
            variant="gradient"
            icon={KeyRound}
            loading={submitting}
          >
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Current password" htmlFor="current-password" required>
          <PasswordInput
            id="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            placeholder="Your temporary or current password"
          />
        </Field>

        <Field label="New password" htmlFor="new-password" required hint="At least 8 characters.">
          <PasswordInput
            id="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>

        <Field label="Confirm new password" htmlFor="confirm-password" required>
          <PasswordInput
            id="confirm-password"
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
      </form>
    </Modal>
  )
}
