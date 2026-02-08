import { useState } from 'react'
import type { FormEvent } from 'react'
import { updateMe } from '../api/users'
import { useAuth } from '../state/auth'
import { ErrorBanner, SuccessBanner } from '../ui/Feedback'

export function ProfilePage() {
  const { user, refreshMe } = useAuth()
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
      setSuccess('Perfil atualizado')
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Perfil</h3>
      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}

      <div style={{ height: 10 }} />
      <form onSubmit={onSubmit} className="row">
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label>Nome completo</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label>Avatar URL</label>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>
        <div>
          <label>Nova senha (opcional)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button className="primary" disabled={saving}>
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}
