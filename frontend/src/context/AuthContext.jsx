import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const persist = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await authApi.login(email, password)
      if (process.env.NODE_ENV === 'development') {
        // Helpful debug output during development
        // eslint-disable-next-line no-console
        console.debug('auth.login response', data)
      }
      persist(data.token, data.user)
      return data.user
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed'
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('auth.login error', err.response?.data || err.message)
      }
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (name, email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await authApi.register(name, email, password)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('auth.register response', data)
      }
      persist(data.token, data.user)
      return data.user
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed'
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('auth.register error', err.response?.data || err.message)
      }
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
