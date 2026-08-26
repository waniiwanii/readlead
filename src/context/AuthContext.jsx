import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentProfile, signInWithNickname, signOutNickname } from '../lib/nicknameAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getCurrentProfile().then((p) => {
      if (mounted) {
        setProfile(p)
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        if (mounted) setProfile(null)
        return
      }
      const p = await getCurrentProfile()
      if (mounted) setProfile(p)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      profile,
      loading,
      async login(nickname) {
        await signInWithNickname(nickname)
        const p = await getCurrentProfile()
        setProfile(p)
        return p
      },
      async logout() {
        await signOutNickname()
        setProfile(null)
      },
    }),
    [profile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
