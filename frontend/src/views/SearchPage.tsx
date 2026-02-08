import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { searchAll, searchArtists, searchPlaylists, searchSongs } from '../api/search'
import { ErrorBanner } from '../ui/Feedback'

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="chipIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="searchInputIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="chipIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MusicIcon() {
  return (
    <Icon>
      <path d="M9 18V6l12-2v12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="19" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
    </Icon>
  )
}

function UserIcon() {
  return (
    <Icon>
      <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    </Icon>
  )
}

function ListIcon() {
  return (
    <Icon>
      <path d="M8 6h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 12h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 18h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 6h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M3 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M3 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </Icon>
  )
}

function SparkIcon() {
  return (
    <Icon>
      <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 14l.9 3L8 18l-3.1 1-0.9 3-0.9-3L1 18l3.1-1L4 14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.85" />
    </Icon>
  )
}

export function SearchPage() {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'all' | 'songs' | 'artists' | 'playlists'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const placeholder = useMemo(() => {
    if (mode === 'songs') return 'Digite o título ou um trecho da letra…'
    if (mode === 'artists') return 'Digite o nome do artista…'
    if (mode === 'playlists') return 'Digite o nome da playlist…'
    return 'Digite o título, trecho, artista ou playlist…'
  }, [mode])

  async function runSearch(nextQ: string, nextMode: typeof mode) {
    setError(null)
    setLoading(true)
    try {
      if (!nextQ.trim()) {
        setResult(null)
        return
      }
      if (nextMode === 'all') setResult(await searchAll({ q: nextQ, limit_per_type: 5, fuzzy_songs: true }))
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

  function ModeButton(props: {
    value: typeof mode
    label: string
    icon: React.ReactNode
  }) {
    const active = mode === props.value
    return (
      <button
        type="button"
        className={active ? 'chip chipBtn isActive' : 'chip chipBtn'}
        onClick={() => {
          setMode(props.value)
          if (hasQuery) void runSearch(q, props.value)
        }}
      >
        {props.icon}
        {props.label}
      </button>
    )
  }

  const songs = mode === 'songs' ? (result as any as Array<any>) : (result?.songs as Array<any> | undefined)
  const artists = mode === 'artists' ? (result as any as Array<any>) : (result?.artists as Array<any> | undefined)
  const playlists = mode === 'playlists' ? (result as any as Array<any>) : (result?.playlists as Array<any> | undefined)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div className="searchCardHeader">
          <div className="searchTitle">
            <SparkIcon />
            <div>
              <div className="h3">Busca</div>
              <div className="muted" style={{ fontSize: 12 }}>Encontre músicas, artistas e playlists.</div>
            </div>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <form onSubmit={onSubmit} className="searchForm">
          <div>
            <label>O que você quer buscar?</label>
            <div className="searchInput">
              <SearchIcon />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
              />
              {q ? (
                <button
                  type="button"
                  className="searchClearBtn"
                  onClick={() => {
                    setQ('')
                    setResult(null)
                    setError(null)
                  }}
                  aria-label="Limpar busca"
                  title="Limpar"
                >
                  <XIcon />
                </button>
              ) : null}
            </div>

            <div className="searchModes chips" aria-label="Tipo de busca">
              <ModeButton value="all" label="Tudo" icon={<SparkIcon />} />
              <ModeButton value="songs" label="Músicas" icon={<MusicIcon />} />
              <ModeButton value="artists" label="Artistas" icon={<UserIcon />} />
              <ModeButton value="playlists" label="Playlists" icon={<ListIcon />} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="primary" disabled={loading}>
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        </form>

        <div style={{ height: 12 }} />
        {error ? <ErrorBanner message={error} /> : null}
        {!loading && !result && !hasQuery ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Exemplos: “Teu Grande Amor”, “Grande é o Senhor”.
          </div>
        ) : null}
        {!loading && hasQuery && !result && !error ? <div className="muted">Nenhum resultado ainda.</div> : null}
      </div>

      {!loading && result ? (
        <>
          {mode === 'all' || mode === 'songs' ? (
            <div className="card">
              <div className="searchSectionTitle">
                <div className="h3" style={{ fontSize: 16 }}>Músicas</div>
                <span className="muted" style={{ fontSize: 12 }}>{(songs || []).length} resultado(s)</span>
              </div>
              <div style={{ height: 10 }} />
              {(songs || []).length ? (
                <div className="list">
                  {(songs || []).map((s: any) => (
                    <div key={s.id} className="listItem">
                      <div className="listMain">
                        <Link className="listTitle" to={`/songs/${s.id}`}>{s.title}</Link>
                        <div className="listSub muted">{s.artist_name || `artist_id=${s.artist_id}`}</div>
                      </div>
                      <div className="listRight">
                        <span className="chip accent">Plays: {s.play_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">Nenhuma música encontrada.</div>
              )}
            </div>
          ) : null}

          {mode === 'all' || mode === 'artists' ? (
            <div className="card">
              <div className="searchSectionTitle">
                <div className="h3" style={{ fontSize: 16 }}>Artistas</div>
                <span className="muted" style={{ fontSize: 12 }}>{(artists || []).length} resultado(s)</span>
              </div>
              <div style={{ height: 10 }} />
              {(artists || []).length ? (
                <div className="list">
                  {(artists || []).map((a: any) => (
                    <div key={a.id} className="listItem">
                      <div className="listMain">
                        <Link className="listTitle" to={`/artists/${a.id}`}>{a.name}</Link>
                        <div className="listSub muted">Artista</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">Nenhum artista encontrado.</div>
              )}
            </div>
          ) : null}

          {mode === 'all' || mode === 'playlists' ? (
            <div className="card">
              <div className="searchSectionTitle">
                <div className="h3" style={{ fontSize: 16 }}>Playlists</div>
                <span className="muted" style={{ fontSize: 12 }}>{(playlists || []).length} resultado(s)</span>
              </div>
              <div style={{ height: 10 }} />
              {(playlists || []).length ? (
                <div className="list">
                  {(playlists || []).map((p: any) => (
                    <div key={p.id} className="listItem">
                      <div className="listMain">
                        <Link className="listTitle" to={`/playlists/${p.id}`}>{p.name}</Link>
                        <div className="listSub muted">{p.song_count} música(s)</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">Nenhuma playlist encontrada.</div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
