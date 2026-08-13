import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ShieldAlert, Mail, Lock, User, ArrowRight, MapPin, Camera } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await signUp({ email, password, username })

    if (error) {
      toast.error(error.message)
      setSubmitting(false)
      return
    }

    toast.success('Account created! Check your email to confirm, then log in.')
    navigate('/login')
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row">
      {/* ---------- LEFT: BRAND PANEL ---------- */}
      <div className="relative flex w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F4C81] via-[#0B3A63] to-[#082A49] px-8 py-10 lg:w-[46%] lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#FCD116]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#CE1126]/25 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FCD116] shadow-lg shadow-black/20">
            <ShieldAlert className="h-6 w-6 text-[#0F4C81]" strokeWidth={2.4} />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/90">
            ROAD HAZARD REPORTING SYSTEM
          </span>
        </div>

        <div className="relative z-10 my-10 lg:my-0">
          <h1 className="text-3xl font-extrabold leading-tight text-white lg:text-4xl">
            Join the effort to keep
            <br />
            <span className="text-[#FCD116]">safer roads</span> for everyone.
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Create a free citizen account to submit hazard reports, upload photos,
            and track their status until they're resolved.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-white/80">
              <Camera className="h-4 w-4 shrink-0 text-[#FCD116]" />
              Attach photos as evidence
            </div>
            <div className="flex items-center gap-3 text-sm text-white/80">
              <MapPin className="h-4 w-4 shrink-0 text-[#FCD116]" />
              Pin the exact hazard location
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div
            className="h-1 w-full rounded-full opacity-60"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #FCD116 0px, #FCD116 18px, transparent 18px, transparent 32px)',
            }}
          />
          <p className="mt-3 text-xs text-white/40">
            Local Government Unit &middot; Public Infrastructure Safety
          </p>
        </div>
      </div>

      {/* ---------- RIGHT: FORM PANEL ---------- */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-[#0F4C81]">Create your account</h2>
          <p className="mt-1 text-sm text-gray-500">Takes less than a minute</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Username</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm text-[#0F4C81] transition focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm text-[#0F4C81] transition focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm text-[#0F4C81] transition focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C81] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0F4C81]/20 transition hover:bg-[#0B3A63] hover:shadow-xl hover:shadow-[#0F4C81]/30 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
              {!submitting && (
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#0F4C81] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}