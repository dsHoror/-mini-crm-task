import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'
import type { ProfileRow } from '../lib/database.types.ts'

export type AuthState = {
  configured: boolean
  loading: boolean
  session: Session | null
  profile: ProfileRow | null
  profileError: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
}

export const AuthContext = createContext<AuthState | null>(null)
