import { useContext } from 'react'
import { AuthContext, type AuthState } from './auth-context.ts'

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth должен вызываться внутри AuthProvider')
  }
  return value
}
