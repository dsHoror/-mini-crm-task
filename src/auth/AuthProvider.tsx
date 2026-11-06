import { type ReactNode, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { errorText } from '../lib/errors.ts'
import type { ProfileRow } from '../lib/database.types.ts'
import { isSupabaseConfigured, supabase } from '../lib/supabase.ts'
import { AuthContext } from './auth-context.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setAuthReady(true)
    })
    const timer = window.setTimeout(() => {
      if (active) setAuthReady(true)
    }, 8000)
    return () => {
      active = false
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!authReady || !supabase) return
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      setProfileLoading(false)
      return
    }

    const db = supabase
    if (!db || !userId) return
    const profileId = userId

    let active = true
    setProfileLoading(true)

    async function loadProfile() {
      try {
        const { data, error } = await db
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', profileId)
          .maybeSingle()
        if (!active) return
        if (error) {
          setProfile(null)
          setProfileError(errorText(error))
        } else if (!data) {
          setProfile(null)
          setProfileError('Профиль не найден. Обратитесь к администратору.')
        } else {
          setProfile(data)
          setProfileError(null)
        }
      } catch (reason) {
        if (!active) return
        setProfile(null)
        setProfileError(errorText(reason))
      } finally {
        if (active) setProfileLoading(false)
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [authReady, userId])

  const value = useMemo(() => {
    return {
      configured: isSupabaseConfigured,
      loading: !authReady || (userId !== null && profileLoading),
      session,
      profile,
      profileError,
      async signIn(email: string, password: string) {
        if (!supabase) return 'Сервис входа не настроен. Обратитесь к администратору.'
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        return error ? errorText(error) : null
      },
      async signOut() {
        if (!supabase) return null
        const { error } = await supabase.auth.signOut()
        return error ? errorText(error) : null
      },
    }
  }, [authReady, profile, profileError, profileLoading, session, userId])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
