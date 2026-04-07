import { useEffect, useMemo, useState } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'
import { addSongToPlaylist, deletePlaylist, getPlaylist, removeSongFromPlaylist, reorderPlaylistSongs } from '../api/playlists'
import { searchSongs } from '../api/search'
import type { SongHymnListResponse } from '../api/types'
import { useAsync } from '../ui/hooks'
import { SongLink } from '../ui/SongLink'

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  )
}

export function PlaylistDetailPageV2() {
  const params = useParams()
  const navigate = useNavigate()
  const id = useMemo(() => Number(params.id), [params.id])
  const state = useAsync(() => getPlaylist(id), [id])
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

  async function onAddFromSearch(song: SongHymnListResponse) {
    setActionError(null)
    setActionSuccess(null)
    try {
      setAddingSongId(song.id)
      await addSongToPlaylist(id, song.id)
      const updated = await getPlaylist(id)
      state.setData(updated)
      setActionSuccess('Música adicionada com sucesso!')
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
    if (!confirm('Tem certeza que deseja deletar esta playlist permanentemente?')) return
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
      setActionSuccess('Ordem de reprodução salva.')
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
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Link to="/playlists" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeftIcon /> Voltar às playlists
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/playlists/${id}/edit`} className="v2-btn v2-btn-outline v2-btn-sm" style={{ padding: '4px 12px' }}>
            <SettingsIcon /> Editar
          </Link>
          <button onClick={() => void onDeletePlaylist()} className="v2-btn v2-btn-outline v2-btn-sm" style={{ padding: '4px 12px', color: '#dc3545', borderColor: '#ffc1c7' }}>
            <TrashIcon /> Excluir
          </button>
        </div>
      </div>

      {state.error && <div className="v2-error" style={{ marginBottom: 16 }}>⚠ {state.error}</div>}
      {actionError && <div className="v2-error" style={{ marginBottom: 16 }}>⚠ {actionError}</div>}
      {actionSuccess && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(58, 133, 40, 0.08)', border: '1px solid rgba(58, 133, 40, 0.20)', fontSize: 13, fontWeight: 600, color: 'var(--primary-dark)' }}>
          ✅ {actionSuccess}
        </div>
      )}

      {state.loading || !state.data ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '40%', height: 32, marginBottom: 16 }} />
          <div className="v2-skeleton v2-skeleton-line" style={{ width: '80%' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '32px 24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ width: 140, height: 140, borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                {state.data.cover_url ? (
                  <img src={state.data.cover_url} alt={state.data.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 40 }}>📋</span>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                  {state.data.name}
                </h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                     Criado por: {state.data.owner_username}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                     {state.data.is_public ? '🌐 Playlist Pública' : '🔒 Playlist Privada'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                     {state.data.song_count} Músicas
                  </span>
                </div>
                {state.data.description && <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{state.data.description}</div>}
              </div>
            </div>
          </div>

          {/* Search/Add */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
             <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)' }}>Adicionar Cifras à Playlist</h2>
             <input
                type="text"
                value={songQuery}
                onChange={(e) => setSongQuery(e.target.value)}
                placeholder="🔍 Digite para buscar uma música..."
                style={{ width: '100%', padding: '12px 16px', fontSize: 15, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-subtle)', outline: 'none', transition: 'border 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
              {songSearching && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>Buscando...</div>}

              {songResults.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {songResults.map((s) => {
                    const already = existingSongIds.has(s.id)
                    const busy = addingSongId === s.id
                    return (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: already ? 'var(--bg-subtle)' : '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                         <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: already ? 'var(--text-muted)' : 'var(--text)' }}>{s.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.artist_name}</div>
                         </div>
                         {already ? (
                           <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--success)', padding: '4px 8px', background: 'rgba(58, 133, 40, 0.1)', borderRadius: 'var(--radius-full)' }}>Na Playlist</span>
                         ) : (
                           <button className="v2-btn v2-btn-outline v2-btn-sm" disabled={busy} onClick={() => void onAddFromSearch(s)}>
                             {busy ? 'Adicionando...' : '+ Adicionar'}
                           </button>
                         )}
                      </div>
                    )
                  })}
                </div>
              )}
          </div>

          {/* Songs List */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
             <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)', borderBottom: '2px solid var(--border-light)', paddingBottom: 8 }}>Lista de Reprodução</h2>
             {(!state.data.songs || state.data.songs.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  Nenhuma música adicionada ainda. Busque e adicione acima!
                </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                 {(state.data.songs || []).map((s) => (
                    <div 
                      key={s.id} 
                      className="v2-top-item" 
                      style={{ padding: '12px 16px', opacity: dragSongId === s.id ? 0.6 : 1, transition: 'box-shadow 0.2s', border: reordering ? '1px dashed var(--border)' : '1px solid transparent' }}
                      onDragOver={onDragOverSong}
                      onDrop={(e) => onDropOnSong(s.id, e)}
                    >
                      <button
                        title={reordering ? 'Reordenando…' : 'Arraste para reordenar'}
                        disabled={reordering}
                        draggable={!reordering}
                        onDragStart={(e) => onDragStartSong(s.id, e)}
                        onDragEnd={() => setDragSongId(null)}
                        style={{ background: 'none', border: 'none', cursor: reordering ? 'not-allowed' : 'grab', color: 'var(--text-muted)', padding: '0 8px', fontSize: 18 }}
                      >
                        ≡
                      </button>
                      
                      <div className="v2-top-info" style={{ marginLeft: 8 }}>
                        <SongLink to={`/songs/${s.id}?playlistId=${id}`} className="v2-top-title" style={{ display: 'block' }}>
                          {s.title}
                        </SongLink>
                        <div className="v2-top-artist">{s.artist_name}</div>
                      </div>

                      <button onClick={() => void onRemoveSong(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8 }} title="Remover da Playlist">
                         <TrashIcon />
                      </button>
                    </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  )
}
