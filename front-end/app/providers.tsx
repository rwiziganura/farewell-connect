'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'

export type UserRole = 'customer' | 'provider' | 'admin'

export type AuthUser = {
  id: string | number
  role: UserRole
  full_name?: string
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  initialized: boolean
  error: string | null
  login: (token: string, user: AuthUser) => void
  logout: (redirectTo?: string) => void
  retryAuthentication: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const roleHome: Record<UserRole, string> = {
  customer: '/dashboard',
  provider: '/provider-dashboard',
  admin: '/admin',
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!isRecord(value)) return false
  return (
    (typeof value.id === 'number' || typeof value.id === 'string') &&
    value.id !== '' &&
    (value.role === 'customer' || value.role === 'provider' || value.role === 'admin')
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retryAuthentication = useCallback(() => {
    setInitialized(false)
    setError(null)
    setRetryCount((count) => count + 1)
  }, [])

  useEffect(() => {
    let active = true

    async function initialize() {
      let savedToken: string | null
      try {
        savedToken = window.localStorage.getItem('fc_token')
      } catch {
        if (active) {
          setError('This browser does not allow access to local storage, so your session cannot be restored.')
          setInitialized(true)
        }
        return
      }

      if (!active) return

      setToken(savedToken)
      if (!savedToken) {
        setUser(null)
        setInitialized(true)
        return
      }

      try {
        const response = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${savedToken}` },
        })

        if (response.status === 401 || response.status === 403) {
          window.localStorage.removeItem('fc_token')
          if (active) {
            setToken(null)
            setUser(null)
          }
          return
        }

        const payload = await parseApiResponse(response)
        if (!response.ok) {
          const message = isRecord(payload) && typeof payload.message === 'string'
            ? payload.message
            : 'Could not verify your session.'
          throw new Error(message)
        }

        const authenticatedUser = isRecord(payload) ? payload.user : null
        if (!isAuthUser(authenticatedUser)) {
          throw new Error('The server returned an invalid user profile.')
        }

        if (active) {
          setUser(authenticatedUser)
          setError(null)
        }
      } catch (reason) {
        if (active) {
          setUser(null)
          setError(reason instanceof Error ? reason.message : 'Could not verify your session.')
        }
      } finally {
        if (active) setInitialized(true)
      }
    }

    void initialize()
    return () => {
      active = false
    }
  }, [retryCount])

  const login = useCallback((newToken: string, authenticatedUser: AuthUser) => {
    window.localStorage.setItem('fc_token', newToken)
    setToken(newToken)
    setUser(authenticatedUser)
    setError(null)
    setInitialized(true)
  }, [])

  const logout = useCallback((redirectTo = '/') => {
    window.localStorage.removeItem('fc_token')
    setToken(null)
    setUser(null)
    setError(null)
    setInitialized(true)
    router.replace(redirectTo)
  }, [router])

  const value = useMemo(
    () => ({ token, user, initialized, error, login, logout, retryAuthentication }),
    [token, user, initialized, error, login, logout, retryAuthentication],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

export function RequireAuth({
  role,
  children,
}: {
  role: UserRole
  children: ReactNode
}) {
  const { token, user, initialized, error, retryAuthentication } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!initialized || error) return
    if (!token || !user) {
      router.replace('/login')
      return
    }
    if (user.role !== role) {
      router.replace(roleHome[user.role])
    }
  }, [token, user, initialized, error, role, router])

  if (!initialized || (!error && (!token || !user || user.role !== role))) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-5 text-center">
        <p role="status" className="text-sm text-[#536172]">Checking your account…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-5">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="font-serif text-2xl text-[#172b4d]">Unable to verify your account</h1>
          <p role="alert" className="mt-3 text-sm text-[#697586]">{error}</p>
          <button
            type="button"
            onClick={retryAuthentication}
            className="mt-6 rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
