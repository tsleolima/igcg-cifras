import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export function RegisterPageV2() {
  const { register, error, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  if (user) {
    return (
      <div className="v2-auth-page">
        <div className="v2-auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
          <h2 className="v2-auth-title">Conta criada!</h2>
          <p className="v2-auth-subtitle" style={{ marginBottom: 22 }}>
            Bem-vindo, <strong>{user.username}</strong>
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
    setLocalError(null)

    if (password !== confirmPassword) {
      setLocalError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setLocalError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setSubmitting(true)
    try {
      await register({
        email,
        username,
        full_name: fullName || null,
        password,
      })
      navigate('/', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = localError || error

  return (
    <div className="v2-auth-page">
      <div className="v2-auth-card">
        <div className="v2-auth-header">
          <img className="v2-auth-logo" src="/igcg-logo.svg" alt="IGCG" />
          <h1 className="v2-auth-title">Criar conta</h1>
          <p className="v2-auth-subtitle">
            Cadastre-se para acessar todas as cifras e recursos
          </p>
        </div>

        {displayError ? <div className="v2-error">⚠ {displayError}</div> : null}

        <form onSubmit={onSubmit} className="v2-auth-form">
          <div className="v2-field">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="v2-field">
            <label htmlFor="register-username">Nome de usuário</label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu_usuario"
              required
              autoComplete="username"
            />
          </div>

          <div className="v2-field">
            <label htmlFor="register-fullname">
              Nome completo <span style={{ opacity: 0.5, fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              id="register-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="João Silva"
              autoComplete="name"
            />
          </div>

          <div className="v2-field">
            <label htmlFor="register-password">Senha</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="v2-field">
            <label htmlFor="register-confirm">Confirmar senha</label>
            <input
              id="register-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          <button className="v2-auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <div className="v2-auth-divider">ou</div>

        <div className="v2-auth-footer">
          Já tem uma conta?{' '}
          <Link to="/login">Fazer login</Link>
        </div>
      </div>
    </div>
  )
}
