import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createPlaylist } from '../api/playlists'
import { ErrorBanner } from '../ui/Feedback'

export function PlaylistCreatePage() {
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

  return (
    <div className="card">
      <div className="muted">
        <Link to="/playlists">← Voltar</Link>
      </div>
      <h3 style={{ marginTop: 6 }}>Nova Playlist</h3>
      {error ? <ErrorBanner message={error} /> : null}
      <form onSubmit={onSubmit} className="row">
        <div>
          <label>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Descrição</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label>Cover URL</label>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
        </div>
        <div>
          <label>Pública</label>
          <select value={isPublic ? '1' : '0'} onChange={(e) => setIsPublic(e.target.value === '1')}>
            <option value="0">Não</option>
            <option value="1">Sim</option>
          </select>
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button className="primary" disabled={saving}>
            Criar
          </button>
        </div>
      </form>
    </div>
  )
}
