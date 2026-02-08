import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { ErrorBanner } from '../ui/Feedback'

export function LoginPage() {
  const { login, error, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return (
      <div className="card">
        <div>Você já está logado.</div>
        <div style={{ height: 8 }} />
        <Link to="/">Ir para Home</Link>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Login</h3>
      {error ? <ErrorBanner message={error} /> : null}
      <div style={{ height: 10 }} />
      <form onSubmit={onSubmit} className="row">
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </div>
        <div>
          <label>Senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button className="primary" disabled={submitting}>
            Entrar
          </button>
        </div>
      </form>
      <div style={{ height: 10 }} />
      <div className="muted">
        Não tem conta? <Link to="/register">Registrar</Link>
      </div>
    </div>
  )
}
