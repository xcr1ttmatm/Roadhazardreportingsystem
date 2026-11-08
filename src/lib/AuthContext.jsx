import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)   // row from public.users (has user_type)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Failed to fetch profile:', error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
  }

  useEffect(() => {
    // Load existing session on first mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) await fetchProfile(session.user.id)
      setLoading(false)
    })

    // Keep session in sync on login/logout/token refresh
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signUp({ email, password, username, fullName, address }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, user_type: 'citizen', full_name: fullName, address }, // inspectors/admins are created by an admin later
      },
    })
    return { data, error }
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  /**
   * Changes the signed-in user's password. Requires an active session — the
   * caller is responsible for verifying the current password first.
   */
  async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    return { data, error }
  }

  /** Sends a password-recovery email that returns to /reset-password. */
  async function sendPasswordReset(email) {
    const redirectTo = `${window.location.origin}/reset-password`
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { data, error }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,          // profile.user_type tells you 'citizen' | 'inspector' | 'admin'
    loading,
    signUp,
    signIn,
    signOut,
    updatePassword,
    sendPasswordReset,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}