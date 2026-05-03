import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { searchAll, searchArtists, searchPlaylists, searchSongs } from '../api/search'
import type {
  ArtistResponse,
  PaginatedResponse,
  PlaylistResponse,
  SearchAllResponse,
  SongHymnListResponse,
} from '../api/types'
import { ErrorBanner } from '../ui/Feedback'

type SearchMode = 'all' | 'songs' | 'artists' | 'playlists'
type SearchResult =
  | SearchAllResponse
  | PaginatedResponse<SongHymnListResponse>
  | PaginatedResponse<ArtistResponse>
  | PaginatedResponse<PlaylistResponse>

type AllPages = {
  songs: number
  artists: number
  playlists: number
}

type SearchSnapshot = {
  q: string
  mode: SearchMode
  page: number
  allPages: AllPages
  scrollY: number
}

type SearchLocationState = {
  searchSnapshot?: SearchSnapshot
}

const PREVIEW_PAGE_SIZE = 8
const DETAIL_PAGE_SIZE = 12

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

function PaginationControls({
  pageData,
  onPageChange,
}: {
  pageData?: PaginatedResponse<unknown> | null
  onPageChange: (page: number) => void
}) {
  if (!pageData || pageData.total_pages <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        Página {pageData.page} de {pageData.total_pages}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="chip chipBtn"
          disabled={!pageData.has_prev}
          onClick={() => onPageChange(pageData.page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="chip chipBtn"
          disabled={!pageData.has_next}
          onClick={() => onPageChange(pageData.page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}

function ResultCounter({ pageData }: { pageData?: PaginatedResponse<unknown> | null }) {
  if (!pageData) return null

  if (!pageData.total) {
    return <span className="muted" style={{ fontSize: 12 }}>0 resultado(s)</span>
  }

  const start = (pageData.page - 1) * pageData.page_size + 1
  const end = Math.min(pageData.page * pageData.page_size, pageData.total)

  return (
    <span className="muted" style={{ fontSize: 12 }}>
      Mostrando {start}-{end} de {pageData.total}
    </span>
  )
}

export function SearchPage() {
  const location = useLocation()
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<SearchMode>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [page, setPage] = useState(1)
  const [allPages, setAllPages] = useState<AllPages>({ songs: 1, artists: 1, playlists: 1 })

  const placeholder = useMemo(() => {
    if (mode === 'songs') return 'Digite o título ou um trecho da letra…'
    if (mode === 'artists') return 'Digite o nome do artista…'
    if (mode === 'playlists') return 'Digite o nome da playlist…'
    return 'Digite o título, trecho, artista ou playlist…'
  }, [mode])

  function restoreScrollPosition(scrollY: number) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'auto' })
      })
    })
  }

  async function runSearch(
    nextQ: string,
    nextMode: SearchMode,
    options?: { page?: number; allPages?: AllPages; restoreScrollY?: number },
  ) {
    setError(null)
    setLoading(true)
    try {
      if (!nextQ.trim()) {
        setResult(null)
        return
      }
      if (nextMode === 'all') {
        const nextAllPages = options?.allPages || allPages
        const response = await searchAll({
          q: nextQ,
          songs_page: nextAllPages.songs,
          artists_page: nextAllPages.artists,
          playlists_page: nextAllPages.playlists,
          page_size: PREVIEW_PAGE_SIZE,
          fuzzy_songs: true,
        })
        setResult(response)
        if (typeof options?.restoreScrollY === 'number') restoreScrollPosition(options.restoreScrollY)
      }
      if (nextMode === 'songs') {
        const nextPage = options?.page || page
        const response = await searchSongs({
          q: nextQ,
          page: nextPage,
          page_size: DETAIL_PAGE_SIZE,
          fuzzy: true,
          min_score: 72,
        })
        setResult(response)
        if (typeof options?.restoreScrollY === 'number') restoreScrollPosition(options.restoreScrollY)
      }
      if (nextMode === 'artists') {
        const nextPage = options?.page || page
        const response = await searchArtists({ q: nextQ, page: nextPage, page_size: DETAIL_PAGE_SIZE })
        setResult(response)
        if (typeof options?.restoreScrollY === 'number') restoreScrollPosition(options.restoreScrollY)
      }
      if (nextMode === 'playlists') {
        const nextPage = options?.page || page
        const response = await searchPlaylists({ q: nextQ, page: nextPage, page_size: DETAIL_PAGE_SIZE })
        setResult(response)
        if (typeof options?.restoreScrollY === 'number') restoreScrollPosition(options.restoreScrollY)
      }
    } catch (e: any) {
      setError(e?.message || 'Falha na busca')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'all') {
      const resetPages = { songs: 1, artists: 1, playlists: 1 }
      setAllPages(resetPages)
      await runSearch(q, mode, { allPages: resetPages })
      return
    }

    setPage(1)
    await runSearch(q, mode, { page: 1 })
  }

  const hasQuery = Boolean(q.trim())

  useEffect(() => {
    const snapshot = (location.state as SearchLocationState | null)?.searchSnapshot
    if (!snapshot?.q.trim()) return

    setQ(snapshot.q)
    setMode(snapshot.mode)
    setPage(snapshot.page)
    setAllPages(snapshot.allPages)

    if (snapshot.mode === 'all') {
      void runSearch(snapshot.q, snapshot.mode, {
        allPages: snapshot.allPages,
        restoreScrollY: snapshot.scrollY,
      })
      return
    }

    void runSearch(snapshot.q, snapshot.mode, {
      page: snapshot.page,
      restoreScrollY: snapshot.scrollY,
    })
  }, [location.key])

  function createSongLinkState(): SearchLocationState {
    return {
      searchSnapshot: {
        q,
        mode,
        page,
        allPages,
        scrollY: window.scrollY,
      },
    }
  }

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
        onClick={() => handleModeChange(props.value)}
      >
        {props.icon}
        {props.label}
      </button>
    )
  }

  const allResult = mode === 'all' ? (result as SearchAllResponse | null) : null
  const songPage = mode === 'songs'
    ? (result as PaginatedResponse<SongHymnListResponse> | null)
    : allResult?.songs
  const artistPage = mode === 'artists'
    ? (result as PaginatedResponse<ArtistResponse> | null)
    : allResult?.artists
  const playlistPage = mode === 'playlists'
    ? (result as PaginatedResponse<PlaylistResponse> | null)
    : allResult?.playlists

  const songs = songPage?.items || []
  const artists = artistPage?.items || []
  const playlists = playlistPage?.items || []

  function handleModeChange(nextMode: SearchMode) {
    setMode(nextMode)
    setError(null)

    if (!hasQuery) return

    if (nextMode === 'all') {
      const resetPages = { songs: 1, artists: 1, playlists: 1 }
      setAllPages(resetPages)
      void runSearch(q, nextMode, { allPages: resetPages })
      return
    }

    setPage(1)
    void runSearch(q, nextMode, { page: 1 })
  }

  function jumpToAllSection(nextMode: Exclude<SearchMode, 'all'>) {
    setMode(nextMode)
    setPage(1)
    void runSearch(q, nextMode, { page: 1 })
  }

  return (
    <div className="searchPageShell" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card searchHeroCard">
        <div className="searchCardHeader">
          <div className="searchTitle">
            <SparkIcon />
            <div>
              <div className="h3">Busca</div>
              <div className="muted" style={{ fontSize: 12 }}>Encontre músicas, artistas e playlists com uma busca mais inteligente.</div>
            </div>
          </div>
          <div className="searchHeroStats chips">
            <span className="chip">Modo: <b>{mode}</b></span>
            <span className="chip">Busca por letra</span>
            <span className="chip accent">Resultados paginados</span>
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
                    setPage(1)
                    setAllPages({ songs: 1, artists: 1, playlists: 1 })
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
          <div className="muted searchHint" style={{ fontSize: 13 }}>
            Exemplos: “Teu Grande Amor”, “Grande é o Senhor”.
          </div>
        ) : null}
        {!loading && hasQuery && !result && !error ? <div className="muted">Nenhum resultado ainda.</div> : null}
      </div>

      {!loading && result ? (
        <>
          {mode === 'all' || mode === 'songs' ? (
            <div className="card searchResultsCard">
              <div className="searchSectionTitle">
                <div className="h3" style={{ fontSize: 16 }}>Músicas</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ResultCounter pageData={songPage} />
                  {mode === 'all' && songPage && songPage.total > songPage.items.length ? (
                    <button type="button" className="chip chipBtn" onClick={() => jumpToAllSection('songs')}>
                      Ver todos
                    </button>
                  ) : null}
                </div>
              </div>
              <div style={{ height: 10 }} />
              {songs.length ? (
                <div className="list featureList">
                  {songs.map((s) => (
                    <div key={s.id} className="listItem featureItem searchEntityItem">
                      <div className="listMain">
                        <Link className="listTitle" to={`/songs/${s.id}`} state={createSongLinkState()}>{s.title}</Link>
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
              <PaginationControls
                pageData={songPage}
                onPageChange={(nextPage) => {
                  if (mode === 'all') {
                    const nextAllPages = { ...allPages, songs: nextPage }
                    setAllPages(nextAllPages)
                    void runSearch(q, 'all', { allPages: nextAllPages })
                    return
                  }

                  setPage(nextPage)
                  void runSearch(q, 'songs', { page: nextPage })
                }}
              />
            </div>
          ) : null}

          {mode === 'all' || mode === 'artists' ? (
            <div className="card searchResultsCard">
              <div className="searchSectionTitle">
                <div className="h3" style={{ fontSize: 16 }}>Artistas</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ResultCounter pageData={artistPage} />
                  {mode === 'all' && artistPage && artistPage.total > artistPage.items.length ? (
                    <button type="button" className="chip chipBtn" onClick={() => jumpToAllSection('artists')}>
                      Ver todos
                    </button>
                  ) : null}
                </div>
              </div>
              <div style={{ height: 10 }} />
              {artists.length ? (
                <div className="list featureList">
                  {artists.map((a) => (
                    <div key={a.id} className="listItem featureItem searchEntityItem">
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
              <PaginationControls
                pageData={artistPage}
                onPageChange={(nextPage) => {
                  if (mode === 'all') {
                    const nextAllPages = { ...allPages, artists: nextPage }
                    setAllPages(nextAllPages)
                    void runSearch(q, 'all', { allPages: nextAllPages })
                    return
                  }

                  setPage(nextPage)
                  void runSearch(q, 'artists', { page: nextPage })
                }}
              />
            </div>
          ) : null}

          {mode === 'all' || mode === 'playlists' ? (
            <div className="card searchResultsCard">
              <div className="searchSectionTitle">
                <div className="h3" style={{ fontSize: 16 }}>Playlists</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ResultCounter pageData={playlistPage} />
                  {mode === 'all' && playlistPage && playlistPage.total > playlistPage.items.length ? (
                    <button type="button" className="chip chipBtn" onClick={() => jumpToAllSection('playlists')}>
                      Ver todos
                    </button>
                  ) : null}
                </div>
              </div>
              <div style={{ height: 10 }} />
              {playlists.length ? (
                <div className="list featureList">
                  {playlists.map((p) => (
                    <div key={p.id} className="listItem featureItem searchEntityItem">
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
              <PaginationControls
                pageData={playlistPage}
                onPageChange={(nextPage) => {
                  if (mode === 'all') {
                    const nextAllPages = { ...allPages, playlists: nextPage }
                    setAllPages(nextAllPages)
                    void runSearch(q, 'all', { allPages: nextAllPages })
                    return
                  }

                  setPage(nextPage)
                  void runSearch(q, 'playlists', { page: nextPage })
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
