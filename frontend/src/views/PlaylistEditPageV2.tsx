import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPlaylist, updatePlaylist } from '../api/playlists'
import { useAsync } from '../ui/hooks'

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

export function PlaylistEditPageV2() {
  const params = useParams()
  const navigate = useNavigate()
  const id = useMemo(() => Number(params.id), [params.id])
  const state = useAsync(() => getPlaylist(id), [id])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!state.data) return
    setName(state.data.name)
    setDescription(state.data.description || '')
    setCoverUrl(state.data.cover_url || '')
    setIsPublic(Boolean(state.data.is_public))
  }, [state.data])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await updatePlaylist(id, {
        name,
        description: description || null,
        cover_url: coverUrl || null,
        is_public: isPublic,
      })
      setSuccess('Playlist atualizada com sucesso.')
      navigate(`/playlists/${updated.id}`, { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar playlist')
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
        <Link to={`/playlists/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeftIcon /> Cancelar edição
        </Link>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Editar Playlist
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Modifique os detalhes da playlist de ID #{id}
        </p>
      </div>

      {state.error && <div className="v2-error" style={{ marginBottom: 24 }}>⚠ {state.error}</div>}
      {error && <div className="v2-error" style={{ marginBottom: 24 }}>⚠ {error}</div>}
      {success && (
        <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(58, 133, 40, 0.08)', border: '1px solid rgba(58, 133, 40, 0.20)', fontSize: 14, fontWeight: 600, color: 'var(--primary-dark)' }}>
          ✅ {success}
        </div>
      )}

      {state.loading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
           <div className="v2-skeleton v2-skeleton-line" style={{ width: '40%', height: 32, marginBottom: 16 }} />
           <div className="v2-skeleton v2-skeleton-line" style={{ width: '80%' }} />
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <label className="v2-field">
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Nome da Playlist <span style={{color: 'red'}}>*</span></span>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
            </label>

            <label className="v2-field">
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Descrição</span>
              <textarea style={{ ...inputStyle, minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} />
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
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
