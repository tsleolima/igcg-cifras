import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export function LoginPageV2() {
  const { login, error, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return (
      <div className="v2-auth-page">
        <div className="v2-auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <h2 className="v2-auth-title">Você já está logado</h2>
          <p className="v2-auth-subtitle" style={{ marginBottom: 22 }}>
            Conectado como <strong>{user.username}</strong>
          </p>
          <Link to="/" className="v2-btn v2-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Ir para Home
          </Link>
        </div>
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
    <div className="v2-auth-page">
      <div className="v2-auth-card">
        <div className="v2-auth-header">
          <img className="v2-auth-logo" src="/igcg-logo.svg" alt="IGCG" />
          <h1 className="v2-auth-title">Bem-vindo de volta</h1>
          <p className="v2-auth-subtitle">
            Faça login para acessar cifras e favoritos
          </p>
        </div>

        {error ? <div className="v2-error">⚠ {error}</div> : null}

        <form onSubmit={onSubmit} className="v2-auth-form">
          <div className="v2-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="v2-field">
            <label htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button className="v2-auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="v2-auth-divider">ou</div>

        <div className="v2-auth-footer">
          Não tem uma conta?{' '}
          <Link to="/register">Criar conta</Link>
        </div>
      </div>
    </div>
  )
}
