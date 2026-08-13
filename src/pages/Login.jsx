import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ShieldAlert, Mail, Lock, ArrowRight, MapPin, TriangleAlert } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

    navigate(`/${profile?.user_type ?? 'citizen'}`)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row">
      {/* ---------- LEFT: BRAND PANEL ---------- */}
      <div className="relative flex w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F4C81] via-[#0B3A63] to-[#082A49] px-8 py-10 lg:w-[46%] lg:px-14 lg:py-14">
        {/* decorative glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#FCD116]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-[#CE1126]/25 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-0 h-40 w-40 rounded-full bg-[#FCD116]/10 blur-2xl" />

        {/* Top: logo mark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FCD116] shadow-lg shadow-black/20">
            <ShieldAlert className="h-6 w-6 text-[#0F4C81]" strokeWidth={2.4} />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/90">
            ROAD HAZARD REPORTING SYSTEM
          </span>
        </div>

        {/* Middle: headline */}
        <div className="relative z-10 my-10 lg:my-0">
          <h1 className="text-3xl font-extrabold leading-tight text-white lg:text-4xl">
            See a hazard.
            <br />
            Report it. <span className="text-[#FCD116]">Fix it.</span>
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Help your community by reporting potholes, cracks, and road damage —
            verified by your local government, visible to everyone.
          </p>

          {/* feature bullets */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-white/80">
              <MapPin className="h-4 w-4 shrink-0 text-[#FCD116]" />
              Pin the exact hazard location on the map
            </div>
            <div className="flex items-center gap-3 text-sm text-white/80">
              <TriangleAlert className="h-4 w-4 shrink-0 text-[#FCD116]" />
              AI-assisted severity detection
            </div>
          </div>
        </div>

        {/* Bottom: road-line motif */}
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
          <h2 className="text-2xl font-bold text-[#0F4C81]">Welcome back</h2>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                  placeholder="you@example.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm text-[#0F4C81] transition focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C81] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0F4C81]/20 transition hover:bg-[#0B3A63] hover:shadow-xl hover:shadow-[#0F4C81]/30 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
              {!submitting && (
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            New citizen user?{' '}
            <Link to="/register" className="font-semibold text-[#0F4C81] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}