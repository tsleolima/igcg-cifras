import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getTopSongs } from '../api/songs'
import { listAlbums } from '../api/albums'
import { useAsync } from '../ui/hooks'
import { SongLink } from '../ui/SongLink'

function SearchIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function ArrowRightIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  )
}

function ChevronRight(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function formatPlays(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

export function HomePageV2() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const topSongs = useAsync(() => getTopSongs({ limit: 10 }), [])
  const albums = useAsync(() => listAlbums({ skip: 0, limit: 20 }), [])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`, { replace: false })
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section className="v2-hero" id="home-hero">
        <div className="v2-hero-badge">🎵 Cifras e Louvores</div>
        <h1 className="v2-hero-title">
          Encontre cifras para<br />tocar na sua localidade
        </h1>
        <p className="v2-hero-subtitle">
          Busque por título, artista ou álbum e acesse cifras com acordes, letras e muito mais.
        </p>
        <form className="v2-hero-search" onSubmit={handleSearch} role="search">
          <SearchIcon className="v2-hero-search-icon" />
          <input
            id="home-search"
            type="search"
            placeholder="Buscar cifras, louvores, artistas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          <button className="v2-hero-search-btn" type="submit" aria-label="Buscar">
            <ArrowRightIcon />
          </button>
        </form>
      </section>

      {/* ── Top Cifras ── */}
      <section className="v2-section" id="home-top-songs">
        <div className="v2-section-header">
          <h2 className="v2-section-title">🔥 Top Cifras</h2>
          <Link to="/songs/top" className="v2-section-link">
            Ver todas <ArrowRightIcon />
          </Link>
        </div>

        {topSongs.loading ? (
          <div className="v2-top-list">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="v2-top-item" style={{ pointerEvents: 'none' }}>
                <div className="v2-top-rank">{String(i + 1).padStart(2, '0')}</div>
                <div className="v2-top-info">
                  <div className="v2-skeleton v2-skeleton-line" style={{ width: `${50 + Math.random() * 35}%` }} />
                  <div className="v2-skeleton v2-skeleton-line short" style={{ width: '35%', height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : topSongs.error ? (
          <div className="v2-error">⚠ {topSongs.error}</div>
        ) : (
          <div className="v2-top-list">
            {(topSongs.data || []).map((s, i) => (
              <SongLink key={s.id} to={`/songs/${s.id}`} className="v2-top-item">
                <span className="v2-top-rank">{String(i + 1).padStart(2, '0')}</span>
                <div className="v2-top-info">
                  <div className="v2-top-title">{s.title}</div>
                  <div className="v2-top-artist">{s.artist_name || '—'}</div>
                </div>
                <div className="v2-top-meta">
                  <span className="v2-top-plays">{formatPlays(s.play_count)} plays</span>
                  <ChevronRight className="v2-top-arrow" />
                </div>
              </SongLink>
            ))}
          </div>
        )}
      </section>

      {/* ── Álbuns ── */}
      <section className="v2-section" id="home-albums">
        <div className="v2-section-header">
          <h2 className="v2-section-title">📀 Álbuns</h2>
          <Link to="/albums" className="v2-section-link">
            Ver todos <ArrowRightIcon />
          </Link>
        </div>

        {albums.loading ? (
          <div className="v2-albums-scroll">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="v2-album-card" style={{ pointerEvents: 'none' }}>
                <div className="v2-album-cover v2-skeleton" />
                <div className="v2-skeleton v2-skeleton-line" style={{ width: '80%', marginTop: 10 }} />
              </div>
            ))}
          </div>
        ) : albums.error ? (
          <div className="v2-error">⚠ {albums.error}</div>
        ) : (
          <div className="v2-albums-scroll">
            {(albums.data || []).map((a) => (
              <Link key={a.id} to={`/albums/${a.id}`} className="v2-album-card">
                <div className="v2-album-cover">
                  {a.cover_url ? (
                    <img src={a.cover_url} alt={a.title} loading="lazy" />
                  ) : (
                    <span>📀</span>
                  )}
                </div>
                <div className="v2-album-name">{a.title}</div>
                {a.release_year ? <div className="v2-album-year">{a.release_year}</div> : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Navegação Rápida ── */}
      <section className="v2-section" id="home-quick-nav">
        <div className="v2-section-header">
          <h2 className="v2-section-title">Navegação rápida</h2>
        </div>
        <div className="v2-quick-nav">
          <Link to="/songs" className="v2-quick-card">
            <div className="v2-quick-icon">🎵</div>
            <div>
              <div className="v2-quick-label">Cifras</div>
              <div className="v2-quick-count">Todas as cifras</div>
            </div>
          </Link>
          <Link to="/artists" className="v2-quick-card">
            <div className="v2-quick-icon">🎤</div>
            <div>
              <div className="v2-quick-label">Artistas</div>
              <div className="v2-quick-count">Em destaque</div>
            </div>
          </Link>
          <Link to="/albums" className="v2-quick-card">
            <div className="v2-quick-icon">📀</div>
            <div>
              <div className="v2-quick-label">Álbuns</div>
              <div className="v2-quick-count">Coleção completa</div>
            </div>
          </Link>
          <Link to="/playlists" className="v2-quick-card">
            <div className="v2-quick-icon">📋</div>
            <div>
              <div className="v2-quick-label">Playlists</div>
              <div className="v2-quick-count">Listas de louvores</div>
            </div>
          </Link>
          <Link to="/favorites" className="v2-quick-card">
            <div className="v2-quick-icon">❤️</div>
            <div>
              <div className="v2-quick-label">Favoritas</div>
              <div className="v2-quick-count">Seus louvores</div>
            </div>
          </Link>
          <Link to="/search" className="v2-quick-card">
            <div className="v2-quick-icon">🔍</div>
            <div>
              <div className="v2-quick-label">Busca Avançada</div>
              <div className="v2-quick-count">Encontre qualquer coisa</div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}
