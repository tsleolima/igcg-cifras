import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchAll, searchArtists, searchPlaylists, searchSongs } from '../api/search'
import { SongLink } from '../ui/SongLink'

function SearchIcon(props: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg className={props.className} style={props.style} viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function MusicIcon(props: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function UserIcon(props: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  )
}

function ListIcon(props: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function SparkIcon(props: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function XIcon(props: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function SearchPageV2() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  
  const [q, setQ] = useState(initialQ)
  const [mode, setMode] = useState<'all' | 'songs' | 'artists' | 'playlists'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const placeholder = useMemo(() => {
    if (mode === 'songs') return 'Digite o título ou trecho da letra…'
    if (mode === 'artists') return 'Digite o nome do artista…'
    if (mode === 'playlists') return 'Digite o nome da playlist…'
    return 'Busque por cifras, artistas ou playlists…'
  }, [mode])

  // Run search on mount or when API URL search param changes
  useEffect(() => {
    const queryStr = searchParams.get('q') || ''
    if (queryStr) {
      setQ(queryStr)
      void runSearch(queryStr, mode)
    } else {
      setResult(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function runSearch(nextQ: string, nextMode: typeof mode) {
    if (!nextQ.trim()) {
      setResult(null)
      return
    }

    setError(null)
    setLoading(true)
    
    // update URL silently
    setSearchParams({ q: nextQ }, { replace: true })

    try {
      if (nextMode === 'all') setResult(await searchAll({ q: nextQ, limit_per_type: 8, fuzzy_songs: true }))
      if (nextMode === 'songs') setResult(await searchSongs({ q: nextQ, limit: 30, fuzzy: true, min_score: 72 }))
      if (nextMode === 'artists') setResult(await searchArtists({ q: nextQ, limit: 30 }))
      if (nextMode === 'playlists') setResult(await searchPlaylists({ q: nextQ, limit: 30 }))
    } catch (e: any) {
      setError(e?.message || 'Falha na busca')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await runSearch(q, mode)
  }

  const hasQuery = Boolean(q.trim())

  function ModeButton(props: { value: typeof mode; label: string; icon: React.ReactNode }) {
    const active = mode === props.value
    return (
      <button
        type="button"
        className={active ? 'v2-btn v2-btn-primary' : 'v2-btn v2-btn-outline'}
        style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)', border: active ? 'none' : '1px solid var(--border)' }}
        onClick={() => {
          setMode(props.value)
          if (hasQuery) void runSearch(q, props.value)
        }}
      >
        {props.icon}
        <span style={{ marginLeft: 6 }}>{props.label}</span>
      </button>
    )
  }

  const songs = mode === 'songs' ? (result as any as Array<any>) : (result?.songs as Array<any> | undefined)
  const artists = mode === 'artists' ? (result as any as Array<any>) : (result?.artists as Array<any> | undefined)
  const playlists = mode === 'playlists' ? (result as any as Array<any>) : (result?.playlists as Array<any> | undefined)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Pesquisa
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Encontre cifras, ritmos, cantores e seleções da IGCG
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
        <form onSubmit={onSubmit}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative', display: 'flex', flex: 1, alignItems: 'center' }}>
              <SearchIcon size={20} className="v2-navbar-search-icon" style={{ position: 'absolute', left: 16, color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--text)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => { setQ(''); setResult(null); setError(null); setSearchParams({}) }}
                  style={{ position: 'absolute', right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
                  aria-label="Limpar busca"
                >
                  <XIcon size={20} />
                </button>
              )}
            </div>
            
            <button 
              type="submit" 
              className="v2-btn v2-btn-primary" 
              style={{ padding: '0 24px', flexShrink: 0 }}
              disabled={loading}
            >
              Buscar
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <ModeButton value="all" label="Tudo" icon={<SparkIcon size={16} />} />
            <ModeButton value="songs" label="Músicas" icon={<MusicIcon size={16} />} />
            <ModeButton value="artists" label="Artistas" icon={<UserIcon size={16} />} />
            <ModeButton value="playlists" label="Playlists" icon={<ListIcon size={16} />} />
          </div>
        </form>

        {error && <div className="v2-error" style={{ marginTop: 16 }}>⚠ {error}</div>}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="v2-top-list">
          {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="v2-top-item" style={{ pointerEvents: 'none' }}>
               <div className="v2-skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
               <div className="v2-top-info" style={{ marginLeft: 16 }}>
                  <div className="v2-skeleton v2-skeleton-line" style={{ width: `${40 + Math.random() * 20}%` }} />
                  <div className="v2-skeleton v2-skeleton-line short" style={{ width: '25%', height: 10 }} />
               </div>
             </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {!loading && !result && !hasQuery && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>O que você quer tocar hoje?</div>
          <p style={{ fontSize: 14, marginTop: 8 }}>Ex: "Teu Grande Amor", "Igreja em Campina Grande"</p>
        </div>
      )}
      {!loading && hasQuery && result && (
        (!songs?.length && !artists?.length && !playlists?.length)
      ) && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🫠</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Nenhum resultado encontrado para "{q}".</div>
          <p style={{ fontSize: 14, marginTop: 8 }}>Verifique a ortografia ou tente alterar as palavras-chave.</p>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {(mode === 'all' || mode === 'songs') && (songs || []).length > 0 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)', borderBottom: '2px solid var(--border-light)', paddingBottom: 8 }}>
                Cifras e Letras
              </h2>
              <div className="v2-top-list">
                {(songs || []).map((s: any) => (
                  <div key={s.id} className="v2-top-item" style={{ cursor: 'default' }}>
                    <div className="v2-quick-icon" style={{ width: 44, height: 44, fontSize: 18 }}>🎸</div>
                    <div className="v2-top-info" style={{ marginLeft: 16 }}>
                      <SongLink to={`/songs/${s.id}`} className="v2-top-title" style={{ display: 'block' }}>
                        {s.title}
                      </SongLink>
                      <Link to={`/artists/${s.artist_id}`} className="v2-top-artist" style={{ display: 'inline-block' }}>
                        {s.artist_name || `artist_id=${s.artist_id}`}
                      </Link>
                    </div>
                    <div className="v2-top-meta">
                       <span className="v2-top-plays">{s.play_count} plays</span>
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v2-top-arrow"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(mode === 'all' || mode === 'artists') && (artists || []).length > 0 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)', borderBottom: '2px solid var(--border-light)', paddingBottom: 8 }}>
                Artistas
              </h2>
              <div className="v2-top-list">
                {(artists || []).map((a: any) => (
                  <Link key={a.id} to={`/artists/${a.id}`} className="v2-top-item" style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: '1px solid var(--border-light)' }}>
                      🎤
                    </div>
                    <div className="v2-top-info" style={{ marginLeft: 16 }}>
                      <div className="v2-top-title" style={{ fontSize: 16 }}>{a.name}</div>
                      <div className="v2-top-artist" style={{ marginTop: 4 }}>Perfil de Artista</div>
                    </div>
                    <div className="v2-top-meta">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v2-top-arrow"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(mode === 'all' || mode === 'playlists') && (playlists || []).length > 0 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)', borderBottom: '2px solid var(--border-light)', paddingBottom: 8 }}>
                Playlists
              </h2>
              <div className="v2-top-list">
                {(playlists || []).map((p: any) => (
                  <Link key={p.id} to={`/playlists/${p.id}`} className="v2-top-item" style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="v2-quick-icon" style={{ width: 44, height: 44, fontSize: 18 }}>📋</div>
                    <div className="v2-top-info" style={{ marginLeft: 16 }}>
                      <div className="v2-top-title" style={{ fontSize: 15 }}>{p.name}</div>
                      <div className="v2-top-artist" style={{ marginTop: 4 }}>Contém {p.song_count} músicas</div>
                    </div>
                    <div className="v2-top-meta">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v2-top-arrow"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
