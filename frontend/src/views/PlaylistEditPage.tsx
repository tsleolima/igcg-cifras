import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPlaylist, updatePlaylist } from '../api/playlists'
import { useAsync } from '../ui/hooks'
import { ErrorBanner, SuccessBanner } from '../ui/Feedback'

export function PlaylistEditPage() {
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
      setSuccess('Atualizado')
      navigate(`/playlists/${updated.id}`, { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="muted">
        <Link to={`/playlists/${id}`}>← Voltar</Link>
      </div>
      <h3 style={{ marginTop: 6 }}>Editar Playlist</h3>

      {state.error ? <ErrorBanner message={state.error} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}

      {state.loading ? (
        <div className="muted">Carregando…</div>
      ) : (
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
              Salvar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
