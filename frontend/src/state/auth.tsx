import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { login as apiLogin, registerUser } from '../api/auth'
import { getMe } from '../api/users'
import type { UserResponse } from '../api/types'
import { clearTokens, getAccessToken, setTokens } from '../api/storage'
import { ApiError } from '../api/http'

type AuthState = {
  user: UserResponse | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; username: string; full_name?: string | null; password: string }) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider(props: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refreshMe() {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      return
    }
    const me = await getMe()
    setUser(me)
  }

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        await refreshMe()
      } catch {
        clearTokens()
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function login(email: string, password: string) {
    setError(null)
    try {
      const tokens = await apiLogin({ email, password })
      setTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
      await refreshMe()
    } catch (e) {
      if (e instanceof ApiError) setError(e.message)
      else setError('Falha no login')
      clearTokens()
      setUser(null)
      throw e
    }
  }

  async function register(data: { email: string; username: string; full_name?: string | null; password: string }) {
    setError(null)
    try {
      await registerUser(data)
      await login(data.email, data.password)
    } catch (e) {
      if (e instanceof ApiError) setError(e.message)
      else setError('Falha no registro')
      throw e
    }
  }

  function logout() {
    clearTokens()
    setUser(null)
  }

  const value = useMemo<AuthState>(
    () => ({ user, loading, error, login, register, logout, refreshMe }),
    [user, loading, error],
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
