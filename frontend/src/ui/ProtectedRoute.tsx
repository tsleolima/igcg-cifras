import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export function ProtectedRoute(props: { element: ReactElement }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="card">Carregando…</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return props.element
}
