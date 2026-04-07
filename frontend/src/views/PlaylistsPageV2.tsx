import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { listMyPlaylists, listPlaylists } from '../api/playlists'
import { useAsync } from '../ui/hooks'



function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}

export function PlaylistsPageV2() {
  const [publicOnly, setPublicOnly] = useState(false)
  const [mode, setMode] = useState<'all' | 'my'>('all')

  const state = useAsync(
    () => (mode === 'my' ? listMyPlaylists({ skip: 0, limit: 100 }) : listPlaylists({ skip: 0, limit: 100, public_only: publicOnly })),
    [mode, publicOnly],
  )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Playlists
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
            Suas listas de louvores e arranjos organizados
          </p>
        </div>
        <Link to="/playlists/new" className="v2-btn v2-btn-primary">
          <PlusIcon /> Nova Playlist
        </Link>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
        
        {/* Filters Form */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
          <label className="v2-field" style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Modo</span>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value as any)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#fff', fontSize: 14, outline: 'none' }}
            >
              <option value="all">Todas (públicas + minhas)</option>
              <option value="my">Apenas minhas playlists</option>
            </select>
          </label>

          <label className="v2-field" style={{ flex: 1, minWidth: 200, opacity: mode !== 'all' ? 0.5 : 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Visibilidade (Modo "Todas")</span>
            <select 
              value={publicOnly ? '1' : '0'} 
              onChange={(e) => setPublicOnly(e.target.value === '1')}
              disabled={mode !== 'all'}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#fff', fontSize: 14, outline: 'none' }}
            >
              <option value="0">Mostrar tudo</option>
              <option value="1">Apenas públicas</option>
            </select>
          </label>

          <div style={{ display: 'flex', alignSelf: 'flex-end' }}>
            <button className="v2-btn v2-btn-outline" type="button" onClick={() => { setMode('all'); setPublicOnly(false); }}>
              Limpar Filtros
            </button>
          </div>
        </form>

        {state.error && <div className="v2-error">⚠ {state.error}</div>}

        {state.loading ? (
          <div className="v2-top-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="v2-top-item" style={{ pointerEvents: 'none' }}>
                <div className="v2-top-info">
                  <div className="v2-skeleton v2-skeleton-line" style={{ width: `${40 + Math.random() * 20}%` }} />
                  <div className="v2-skeleton v2-skeleton-line short" style={{ width: '25%', height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {(state.data || []).length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                 <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                 <div style={{ fontSize: 15 }}>Nenhuma playlist encontrada.</div>
               </div>
            ) : (
              <div className="v2-top-list">
                {(state.data || []).map((p) => (
                  <Link key={p.id} to={`/playlists/${p.id}`} className="v2-top-item" style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="v2-quick-icon" style={{ width: 44, height: 44, fontSize: 18 }}>📋</div>
                    <div className="v2-top-info" style={{ marginLeft: 16 }}>
                      <div className="v2-top-title" style={{ fontSize: 15 }}>{p.name}</div>
                      <div className="v2-top-artist" style={{ marginTop: 4 }}>
                        Criada por {p.owner_username} • {p.is_public ? 'Pública 🌍' : 'Privada 🔒'} • {p.song_count} músicas
                      </div>
                      {p.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.description}</div>}
                    </div>
                    <div className="v2-top-meta">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v2-top-arrow"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
