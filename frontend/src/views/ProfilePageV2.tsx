import { useState } from 'react'
import type { FormEvent } from 'react'
import { updateMe } from '../api/users'
import { useAuth } from '../state/auth'

export function ProfilePageV2() {
  const { user, refreshMe, logout } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [username, setUsername] = useState(user?.username || '')
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!user) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateMe({
        email: email || undefined,
        username: username || undefined,
        full_name: fullName || null,
        avatar_url: avatarUrl || null,
        password: password || null,
      })
      setPassword('')
      await refreshMe()
      setSuccess('Perfil atualizado com sucesso!')
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar o perfil')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-subtle)',
    fontSize: 15,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border 0.2s'
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#fff', border: '4px solid #fff', boxShadow: 'var(--shadow-sm)' }}>
          {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : user.username.charAt(0).toUpperCase()}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Meu Perfil
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Gerencie suas informações pessoais e credenciais
        </p>
      </div>

      {error && <div className="v2-error" style={{ marginBottom: 24 }}>⚠ {error}</div>}
      {success && (
        <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(58, 133, 40, 0.08)', border: '1px solid rgba(58, 133, 40, 0.20)', fontSize: 14, fontWeight: 600, color: 'var(--primary-dark)' }}>
          ✅ {success}
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 16 }}>
             <label className="v2-field" style={{ flex: 1 }}>
               <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Usuário (Username)</span>
               <input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} />
             </label>
             <label className="v2-field" style={{ flex: 1 }}>
               <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Nome Completo</span>
               <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: João da Silva" />
             </label>
          </div>

          <label className="v2-field">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Endereço de E-mail</span>
            <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="v2-field">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Avatar URL (opcional)</span>
            <input style={inputStyle} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </label>

          <div style={{ height: 1, background: 'var(--border-light)', margin: '8px 0' }} />

          <label className="v2-field">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Nova Senha (deixe em branco para não alterar)</span>
            <input type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </label>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="v2-btn v2-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button type="button" className="v2-btn v2-btn-outline" style={{ color: '#dc3545', borderColor: '#ffc1c7' }} onClick={logout}>
               Sair da Conta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
