import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createPlaylist } from '../api/playlists'

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

export function PlaylistCreatePageV2() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = await createPlaylist({
        name,
        description: description || null,
        cover_url: coverUrl || null,
        is_public: isPublic,
      })
      navigate(`/playlists/${created.id}`, { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar playlist')
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
      <div style={{ marginBottom: 16 }}>
        <Link to="/playlists" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeftIcon /> Voltar às playlists
        </Link>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Nova Playlist
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Crie um agrupamento de canções para o seu ministério.
        </p>
      </div>

      {error && <div className="v2-error" style={{ marginBottom: 24 }}>⚠ {error}</div>}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label className="v2-field">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Nome da Playlist <span style={{color: 'red'}}>*</span></span>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Louvores Culto de Domingo" required />
          </label>

          <label className="v2-field">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Descrição</span>
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Alguma observação sobre as músicas escolhidas..." />
          </label>

          <label className="v2-field">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Capa URL da Playlist (opcional)</span>
            <input style={inputStyle} value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
          </label>

          <label className="v2-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'none' }}>
            <input 
              type="checkbox" 
              checked={isPublic} 
              onChange={(e) => setIsPublic(e.target.checked)} 
              style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
            />
            <div>
               <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Tornar Playlist Pública</div>
               <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Qualquer pessoa com o link poderá ver as cifras.</div>
            </div>
          </label>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="v2-btn v2-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving || !name.trim()}>
              {saving ? 'Criando...' : 'Criar Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
