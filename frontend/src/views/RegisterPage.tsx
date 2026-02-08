import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { ErrorBanner } from '../ui/Feedback'

export function RegisterPage() {
  const { register, error, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
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
      await register({ email, username, full_name: fullName || null, password })
      navigate('/', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Registrar</h3>
      {error ? <ErrorBanner message={error} /> : null}
      <div style={{ height: 10 }} />
      <form onSubmit={onSubmit} className="row">
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </div>
        <div>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="joao" />
        </div>
        <div>
          <label>Nome completo (opcional)</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="João Silva" />
        </div>
        <div>
          <label>Senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button className="primary" disabled={submitting}>
            Criar conta
          </button>
        </div>
      </form>
      <div style={{ height: 10 }} />
      <div className="muted">
        Já tem conta? <Link to="/login">Login</Link>
      </div>
    </div>
  )
}
