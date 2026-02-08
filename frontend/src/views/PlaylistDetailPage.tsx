import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addSongToPlaylist, deletePlaylist, getPlaylist, removeSongFromPlaylist, reorderPlaylistSongs } from '../api/playlists'
import { searchSongs } from '../api/search'
import type { SongHymnListResponse } from '../api/types'
import { useAsync } from '../ui/hooks'
import { ErrorBanner, SuccessBanner } from '../ui/Feedback'

export function PlaylistDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const id = useMemo(() => Number(params.id), [params.id])
  const state = useAsync(() => getPlaylist(id), [id])
  const [songId, setSongId] = useState('')
  const [songQuery, setSongQuery] = useState('')
  const [songResults, setSongResults] = useState<SongHymnListResponse[]>([])
  const [songSearching, setSongSearching] = useState(false)
  const [addingSongId, setAddingSongId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [dragSongId, setDragSongId] = useState<number | null>(null)
  const [reordering, setReordering] = useState(false)

  const existingSongIds = useMemo(() => {
    const ids = new Set<number>()
    for (const s of state.data?.songs || []) ids.add(s.id)
    return ids
  }, [state.data])

  useEffect(() => {
    const q = songQuery.trim()
    if (!q) {
      setSongResults([])
      setSongSearching(false)
      return
    }

    const handle = setTimeout(() => {
      ;(async () => {
        setSongSearching(true)
        try {
          const res = await searchSongs({ q, limit: 12, fuzzy: true })
          setSongResults(res)
        } catch {
          setSongResults([])
        } finally {
          setSongSearching(false)
        }
      })()
    }, 250)

    return () => clearTimeout(handle)
  }, [songQuery])

  async function onAddSong(e: FormEvent) {
    e.preventDefault()
    setActionError(null)
    setActionSuccess(null)
    try {
      const sid = Number(songId)
      await addSongToPlaylist(id, sid)
      setSongId('')
      const updated = await getPlaylist(id)
      state.setData(updated)
      setActionSuccess('Música adicionada')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao adicionar música')
    }
  }

  async function onAddFromSearch(song: SongHymnListResponse) {
    setActionError(null)
    setActionSuccess(null)
    try {
      setAddingSongId(song.id)
      await addSongToPlaylist(id, song.id)
      const updated = await getPlaylist(id)
      state.setData(updated)
      setActionSuccess('Música adicionada')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao adicionar música')
    } finally {
      setAddingSongId(null)
    }
  }

  async function onRemoveSong(sid: number) {
    setActionError(null)
    setActionSuccess(null)
    try {
      await removeSongFromPlaylist(id, sid)
      const updated = await getPlaylist(id)
      state.setData(updated)
      setActionSuccess('Música removida')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao remover música')
    }
  }

  async function onDeletePlaylist() {
    if (!confirm('Tem certeza que deseja deletar esta playlist?')) return
    setActionError(null)
    setActionSuccess(null)
    try {
      await deletePlaylist(id)
      navigate('/playlists', { replace: true })
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao deletar playlist')
    }
  }

  async function persistOrder(nextSongIds: number[]) {
    setActionError(null)
    setActionSuccess(null)
    try {
      setReordering(true)
      await reorderPlaylistSongs(id, nextSongIds)
      const updated = await getPlaylist(id)
      state.setData(updated)
      setActionSuccess('Ordem atualizada')
    } catch (e: any) {
      setActionError(e?.message || 'Falha ao reordenar playlist')
      const updated = await getPlaylist(id)
      state.setData(updated)
    } finally {
      setReordering(false)
      setDragSongId(null)
    }
  }

  function onDragStartSong(songId: number, e: React.DragEvent) {
    setDragSongId(songId)
    try {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(songId))
    } catch {
      // no-op
    }
  }

  function onDragOverSong(e: React.DragEvent) {
    e.preventDefault()
    try {
      e.dataTransfer.dropEffect = 'move'
    } catch {
      // no-op
    }
  }

  function onDropOnSong(targetSongId: number, e: React.DragEvent) {
    e.preventDefault()
    const payload = (() => {
      try {
        return e.dataTransfer.getData('text/plain')
      } catch {
        return ''
      }
    })()
    const dragged = Number(payload) || dragSongId
    if (!dragged || dragged === targetSongId) return
    if (!state.data?.songs?.length) return

    const current = [...state.data.songs]
    const fromIndex = current.findIndex((s) => s.id === dragged)
    const toIndex = current.findIndex((s) => s.id === targetSongId)
    if (fromIndex < 0 || toIndex < 0) return

    const [item] = current.splice(fromIndex, 1)
    current.splice(toIndex, 0, item)

    const next = current.map((s, index) => ({ ...s, position: index }))
    state.setData({ ...state.data, songs: next, song_count: next.length })
    void persistOrder(next.map((s) => s.id))
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div className="muted">
          <Link to="/playlists">← Voltar</Link>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to={`/playlists/${id}/edit`}>
            <button>Editar</button>
          </Link>
          <button onClick={() => void onDeletePlaylist()}>Deletar</button>
        </div>
      </div>

      {state.error ? <ErrorBanner message={state.error} /> : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {actionSuccess ? <SuccessBanner message={actionSuccess} /> : null}

      {state.loading || !state.data ? (
        <div className="muted">Carregando…</div>
      ) : (
        <>
          <h3 style={{ marginTop: 10 }}>{state.data.name}</h3>
          <div className="muted">
            owner: {state.data.owner_username} • pública: {state.data.is_public ? 'sim' : 'não'} • songs: {state.data.song_count}
          </div>
          {state.data.description ? <pre>{state.data.description}</pre> : null}

          <div style={{ height: 12 }} />
          <div className="card">
            <h4 style={{ marginTop: 0 }}>Adicionar música</h4>
            <div className="row">
              <div>
                <label>Buscar música</label>
                <input
                  value={songQuery}
                  onChange={(e) => setSongQuery(e.target.value)}
                  placeholder="Digite o nome da música…"
                />
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {songSearching ? 'Buscando…' : songQuery.trim() ? `${songResults.length} resultado(s)` : 'Dica: digite para buscar e adicionar'}
                </div>
              </div>
            </div>

            {songResults.length ? (
              <div style={{ height: 10 }} />
            ) : null}

            {songResults.length ? (
              <div className="searchResults">
                {songResults.map((s) => {
                  const already = existingSongIds.has(s.id)
                  const busy = addingSongId === s.id
                  return (
                    <div key={s.id} className="searchResult">
                      <div>
                        <div style={{ fontWeight: 650 }}>{s.title}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{s.artist_name || `artist_id=${s.artist_id}`}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {already ? (
                          <span className="chip">Já adicionada</span>
                        ) : (
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() => void onAddFromSearch(s)}
                          >
                            {busy ? 'Adicionando…' : 'Adicionar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}

            <div style={{ height: 10 }} />
            <details>
              <summary>Adicionar por ID (avançado)</summary>
              <div style={{ height: 10 }} />
              <form onSubmit={onAddSong} className="row">
                <div>
                  <label>Song ID</label>
                  <input value={songId} onChange={(e) => setSongId(e.target.value)} placeholder="123" />
                </div>
                <div style={{ alignSelf: 'end' }}>
                  <button className="primary">Adicionar</button>
                </div>
              </form>
            </details>
          </div>

          <div style={{ height: 12 }} />
          <h4 style={{ marginTop: 0 }}>Songs</h4>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th></th>
                <th>Título</th>
                <th>Artista</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(state.data.songs || []).map((s) => (
                <tr
                  key={s.id}
                  onDragOver={onDragOverSong}
                  onDrop={(e) => onDropOnSong(s.id, e)}
                  style={{ opacity: dragSongId === s.id ? 0.6 : 1 }}
                >
                  <td>{s.position}</td>
                  <td style={{ width: 44 }}>
                    <button
                      title={reordering ? 'Reordenando…' : 'Arraste para reordenar'}
                      disabled={reordering}
                      draggable={!reordering}
                      onDragStart={(e) => onDragStartSong(s.id, e)}
                      onDragEnd={() => setDragSongId(null)}
                      style={{ cursor: reordering ? 'not-allowed' : 'grab' }}
                    >
                      ≡
                    </button>
                  </td>
                  <td>
                    <Link to={`/songs/${s.id}?playlistId=${id}`}>{s.title}</Link>
                  </td>
                  <td>{s.artist_name}</td>
                  <td>
                    <button onClick={() => void onRemoveSong(s.id)}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
